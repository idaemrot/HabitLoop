import type { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// ─── Generic Zod Validation Middleware ───────────────────────────────────────
// Usage:  router.post('/register', validate(registerSchema), handler)
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse({
        body:   req.body,
        query:  req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field:   e.path.slice(1).join('.'),  // strip 'body.' prefix
          message: e.message,
        }));

        res.status(422).json({
          status:  'error',
          message: 'Validation failed',
          errors,
        });
        return;
      }
      next(err);
    }
  };
}
