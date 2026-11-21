import { z } from "zod";

export const swipeSchema = z.strictObject({
  fromProfileId: z.string().min(1),
  toProfileId: z.string().min(1),
  liked: z.boolean(),
});

export type Swipe = z.infer<typeof swipeSchema>;
