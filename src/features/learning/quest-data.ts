import { z } from "zod";

const label = z.string().trim().min(1).max(140);
const detail = z.string().trim().min(1).max(500);
const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim().toLowerCase();
const distinct = (values: string[]) => new Set(values.map(normalize)).size === values.length;
const choices = z.array(detail).length(3).refine(distinct);
const index = z.number().int().min(0).max(2);

const room = z.object({
  title: label,
  prompt: detail,
  hint: detail,
  explanation: detail,
  evidence: detail,
});

const match = room.extend({
  kind: z.literal("match"),
  pairs: z.array(z.object({ term: label, meaning: detail })).min(3).max(4),
}).refine(({ pairs }) => distinct(pairs.map((pair) => pair.term))
  && distinct(pairs.map((pair) => pair.meaning)));

const order = room.extend({
  kind: z.literal("order"),
  steps: z.array(detail).min(3).max(4).refine(distinct),
});

const detective = room.extend({
  kind: z.literal("detective"),
  claims: choices,
  falseIndex: index,
  otherExcerpts: z.array(detail).length(2).refine(distinct),
  corrections: choices,
  correctIndex: index,
}).refine(({ evidence, otherExcerpts }) => distinct([evidence, ...otherExcerpts]));

const apply = room.extend({
  kind: z.literal("apply"),
  options: choices,
  correctIndex: index,
});

export const questSchema = z.object({
  title: label,
  mission: detail,
  rooms: z.tuple([match, z.union([order, match]), detective, apply]),
});

export type Quest = z.infer<typeof questSchema>;
export type QuestRoom = Quest["rooms"][number];

export const questProgressSchema = z.array(z.object({
  misses: z.number().int().nonnegative(),
  solved: z.boolean(),
})).length(4);

export type QuestProgress = z.infer<typeof questProgressSchema>;

export function newQuestProgress(quest: Quest): QuestProgress {
  return quest.rooms.map(() => ({ misses: 0, solved: false }));
}

export function hasSourceEvidence(quest: Quest, source: string) {
  const pages = source.split(/^\[Page \d+\]\s*$/m).map(normalize);
  return quest.rooms.every((room) => {
    const excerpts = room.kind === "detective" ? [room.evidence, ...room.otherExcerpts] : [room.evidence];
    return excerpts.every((excerpt) => pages.some((page) => page.includes(normalize(excerpt))));
  });
}
