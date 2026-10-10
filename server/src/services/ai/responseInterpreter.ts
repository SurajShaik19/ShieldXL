import { ResultCategory } from '../../types/index.js';

export interface InterpretationResult {
  category: ResultCategory;
  observations: string[];
  limitations: string[];
  summary: string;
}

export class ResponseInterpreter {
  /**
   * Transparently interprets the natural language output from Meta AI or Grok.
   * Preserves raw evidence, categorizes without fabricated probabilities,
   * and separates AI observations from forensic certainty.
   */
  public static interpret(rawText: string): InterpretationResult {
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return {
        category: 'ANALYSIS_FAILED',
        observations: ['No text response was obtained from the AI interface.'],
        limitations: ['Empty or null response payload.'],
        summary: 'No response could be extracted from the AI service.',
      };
    }

    const text = rawText.trim();
    const lower = text.toLowerCase();

    const observations: string[] = [];
    const limitations: string[] = [
      'Assessment is based on natural language model observations and visual indicators, not hardware-level forensic analysis.',
      'Social media compression, re-encoding, and platform filtering can obscure or mimic manipulation artifacts.',
    ];

    // Check for unable-to-analyze or inaccessible indicators
    const inaccessiblePatterns = [
      'cannot access',
      'unable to access',
      'cannot browse',
      'do not have access',
      'cannot view the link',
      'link is private',
      'login required',
      'cannot open external links',
      'cannot load this url',
      'please provide an image or video directly',
      'unable to retrieve the content',
      'not able to access real-time',
    ];

    for (const pat of inaccessiblePatterns) {
      if (lower.includes(pat)) {
        return {
          category: 'UNABLE_TO_ANALYZE',
          observations: ['AI assistant indicated it cannot directly fetch or inspect the specified URL content.'],
          limitations: [
            ...limitations,
            'The target social media post is restricted by platform access policies or requires authenticated app session.',
          ],
          summary: 'The AI model was unable to access the content at the submitted URL.',
        };
      }
    }

    // Check for strong manipulation signals
    const manipulationIndicators = [
      'deepfake',
      'ai-generated',
      'ai generated',
      'manipulated',
      'altered',
      'synthetic media',
      'face swapped',
      'faceswap',
      'unnatural artifacts',
      'warping around the edges',
      'inconsistent lighting',
      'diffusion artifacts',
      'voice clone',
      'cloned voice',
      'fabricated',
      'digitally altered',
      'generated using ai',
      'shows signs of manipulation',
    ];

    // Check for authentic / no signals detected indicators
    const authenticIndicators = [
      'no signs of manipulation',
      'appears authentic',
      'genuine video',
      'genuine photograph',
      'no evidence of ai generation',
      'consistent lighting and shadows',
      'original unedited',
      'natural motion',
      'no obvious manipulation',
      'likely authentic',
      'matches verified footage',
      'verified by news outlets',
    ];

    // Check for inconclusive signals
    const inconclusiveIndicators = [
      'inconclusive',
      'hard to tell',
      'cannot be determined with certainty',
      'insufficient resolution',
      'resolution is too low',
      'blurry',
      'further verification needed',
      'possibility either way',
      'cannot verify authenticity',
    ];

    // Extract bullet points or distinct sentences as observations
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 15);
    for (const line of lines) {
      const cleanLine = line.replace(/^[-*•\d.]+\s*/, '');
      if (cleanLine.length > 20 && cleanLine.length < 250 && !observations.includes(cleanLine)) {
        observations.push(cleanLine);
      }
      if (observations.length >= 6) break;
    }

    // Determine category based on balanced heuristic evaluation
    const manipulationHits = manipulationIndicators.filter((i) => lower.includes(i)).length;
    const authenticHits = authenticIndicators.filter((i) => lower.includes(i)).length;
    const inconclusiveHits = inconclusiveIndicators.filter((i) => lower.includes(i)).length;

    let category: ResultCategory = 'INCONCLUSIVE';

    if (manipulationHits > 0 && manipulationHits >= authenticHits && !lower.includes('not a deepfake') && !lower.includes('no signs of ai')) {
      category = 'POTENTIAL_MANIPULATION';
    } else if (authenticHits > 0 && authenticHits > manipulationHits) {
      category = 'NO_STRONG_SIGNALS_DETECTED';
    } else if (inconclusiveHits > 0) {
      category = 'INCONCLUSIVE';
    } else {
      category = 'INCONCLUSIVE';
    }

    return {
      category,
      observations: observations.length > 0 ? observations : [text.slice(0, 200)],
      limitations,
      summary: `Automated assessment classified as ${category} based on model response cues.`,
    };
  }
}
