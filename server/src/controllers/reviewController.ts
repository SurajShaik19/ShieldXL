import { Response } from 'express';
import { z } from 'zod';
import { AnalysisModel } from '../models/Analysis.js';
import { ReviewModel } from '../models/Review.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { isDbConnected } from '../config/db.js';
import { memoryStore } from '../models/memoryStore.js';

const decisionSchema = z.object({
  decision: z.enum([
    'CONFIRMED_MANIPULATION',
    'CONFIRMED_AUTHENTIC',
    'INCONCLUSIVE_REVIEW',
    'FLAGGED_FOR_ESCALATION',
  ]),
  notes: z.string().min(5, 'Notes must be at least 5 characters'),
  escalationStatus: z.enum(['NONE', 'ESCALATED_TO_TIER2', 'RESOLVED']).optional(),
});

export class ReviewController {
  /**
   * GET /api/reviews - Get list of cases requiring review
   */
  public static async listPendingReviews(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (isDbConnected()) {
        const cases = await AnalysisModel.find({ requiresReview: true })
          .sort({ createdAt: -1 })
          .populate('owner', 'name email role');

        const reviews = await ReviewModel.find().populate('reviewer', 'name email');

        res.json({ cases, reviews });
      } else {
        const { memoryStore } = await import('../models/memoryStore.js');
        const cases = Array.from(memoryStore.analyses.values())
          .filter((a) => a.requiresReview)
          .map((a) => {
            const ownerObj = typeof a.owner === 'string' ? memoryStore.users.get(a.owner) : a.owner;
            return {
              ...a,
              owner: ownerObj || { _id: a.owner, name: 'Analyst Demo', email: 'analyst@defense.agency', role: 'USER' },
            };
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const reviews = Array.from(memoryStore.reviews.values()).map((r) => {
          const revObj = typeof r.reviewer === 'string' ? memoryStore.users.get(r.reviewer) : r.reviewer;
          return {
            ...r,
            reviewer: revObj || { _id: r.reviewer, name: 'Senior Reviewer', email: 'reviewer@defense.agency' },
          };
        });

        res.json({ cases, reviews });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching review cases.' });
    }
  }

  /**
   * POST /api/reviews/:id/decision - Submit reviewer verdict
   */
  public static async submitDecision(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const parsed = decisionSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      const { decision, notes, escalationStatus } = parsed.data;

      if (isDbConnected()) {
        const analysis = await AnalysisModel.findById(id);
        if (!analysis) {
          res.status(404).json({ error: 'Analysis not found.' });
          return;
        }

        const review = await ReviewModel.create({
          analysis: analysis._id,
          reviewer: req.user!.userId,
          decision,
          notes,
          escalationStatus: escalationStatus || 'NONE',
        });

        // Update analysis state
        if (decision === 'CONFIRMED_MANIPULATION') {
          analysis.resultCategory = 'POTENTIAL_MANIPULATION';
        } else if (decision === 'CONFIRMED_AUTHENTIC') {
          analysis.resultCategory = 'NO_STRONG_SIGNALS_DETECTED';
        } else if (decision === 'INCONCLUSIVE_REVIEW') {
          analysis.resultCategory = 'INCONCLUSIVE';
        }

        analysis.requiresReview = escalationStatus === 'ESCALATED_TO_TIER2';
        await analysis.save();

        res.json({
          message: 'Review decision recorded successfully.',
          review,
          analysis,
        });
      } else {
        const { memoryStore } = await import('../models/memoryStore.js');
        const analysis = memoryStore.analyses.get(id);
        if (!analysis) {
          res.status(404).json({ error: 'Analysis not found.' });
          return;
        }

        const review = {
          _id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          analysis: analysis._id,
          reviewer: req.user!.userId,
          decision,
          notes,
          escalationStatus: escalationStatus || 'NONE',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        memoryStore.reviews.set(review._id, review);

        if (decision === 'CONFIRMED_MANIPULATION') {
          analysis.resultCategory = 'POTENTIAL_MANIPULATION';
        } else if (decision === 'CONFIRMED_AUTHENTIC') {
          analysis.resultCategory = 'NO_STRONG_SIGNALS_DETECTED';
        } else if (decision === 'INCONCLUSIVE_REVIEW') {
          analysis.resultCategory = 'INCONCLUSIVE';
        }

        analysis.requiresReview = escalationStatus === 'ESCALATED_TO_TIER2';
        analysis.updatedAt = new Date();

        res.json({
          message: 'Review decision recorded successfully.',
          review,
          analysis,
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error recording review decision.' });
    }
  }
}
