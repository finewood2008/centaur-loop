import type { CentaurLoopConfig } from '../types';
import { SEO_GROWTH_LOOP_CONFIG } from './seoGrowthLoop';
import { CUSTOMER_SUPPORT_LOOP_CONFIG } from './customerSupportLoop';
import { PRODUCT_ITERATION_LOOP_CONFIG } from './productIterationLoop';

export { SEO_GROWTH_LOOP_CONFIG } from './seoGrowthLoop';
export { CUSTOMER_SUPPORT_LOOP_CONFIG } from './customerSupportLoop';
export { PRODUCT_ITERATION_LOOP_CONFIG } from './productIterationLoop';

export const ALL_LOOP_CONFIGS: CentaurLoopConfig[] = [
  SEO_GROWTH_LOOP_CONFIG,
  CUSTOMER_SUPPORT_LOOP_CONFIG,
  PRODUCT_ITERATION_LOOP_CONFIG,
];
