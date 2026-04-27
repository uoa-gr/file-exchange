import type { Migration } from '../runner.js';
import { migration001 } from './001_initial.js';

export const migrations: Migration[] = [migration001];
