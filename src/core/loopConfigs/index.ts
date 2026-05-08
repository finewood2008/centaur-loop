import type { CentaurLoopConfig } from '../types';
import { SEO_GROWTH_LOOP_CONFIG } from './seoGrowthLoop';
import { VIDEO_PRODUCTION_LOOP_CONFIG } from './videoLoop';

export { SEO_GROWTH_LOOP_CONFIG } from './seoGrowthLoop';
export { VIDEO_PRODUCTION_LOOP_CONFIG } from './videoLoop';

export const ALL_LOOP_CONFIGS: CentaurLoopConfig[] = [
  SEO_GROWTH_LOOP_CONFIG,
  VIDEO_PRODUCTION_LOOP_CONFIG,
];
