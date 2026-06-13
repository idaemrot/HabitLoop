import { z } from 'zod';

// ─── Shared field definitions ─────────────────────────────────────────────────
const titleField = z
  .string({ required_error: 'Title is required' })
  .min(1,   'Title cannot be empty')
  .max(100, 'Title must be at most 100 characters')
  .trim();

const descriptionField = z
  .string()
  .max(500, 'Description must be at most 500 characters')
  .trim()
  .optional();

const colorField = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color (e.g. #D4FF4F)')
  .optional()
  .default('#6C5CE7');

const iconField = z
  .string()
  .max(64, 'Icon identifier too long')
  .optional()
  .default('flame');

const frequencyField = z
  .enum(['DAILY', 'WEEKLY', 'CUSTOM'])
  .optional()
  .default('DAILY');

// ─── Create Habit ─────────────────────────────────────────────────────────────
export const createHabitSchema = z.object({
  body: z.object({
    title:       titleField,
    description: descriptionField,
    frequency:   frequencyField,
    color:       colorField,
    icon:        iconField,
  }),
});

// ─── Update Habit ─────────────────────────────────────────────────────────────
// All fields optional — supports partial updates (PATCH semantics)
export const updateHabitSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid habit ID'),
  }),
  body: z.object({
    title:       titleField.optional(),
    description: descriptionField,
    frequency:   z.enum(['DAILY', 'WEEKLY', 'CUSTOM']).optional(),
    color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon:        z.string().max(64).optional(),
    isArchived:  z.boolean().optional(),
  }).refine(
    (data) => Object.keys(data).length > 0,
    'At least one field must be provided to update',
  ),
});

// ─── Habit ID param ───────────────────────────────────────────────────────────
export const habitIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid habit ID'),
  }),
});

// ─── Inferred types ───────────────────────────────────────────────────────────
export type CreateHabitInput = z.infer<typeof createHabitSchema>['body'];
export type UpdateHabitInput = z.infer<typeof updateHabitSchema>['body'];
