import { z } from "zod";

// ─── Platform types ───
export type Platform =
  | "github"
  | "huggingface"
  | "arxiv"
  | "reddit"
  | "hackernews"
  | "twitter"
  | "other";

export const PlatformSchema = z.enum([
  "github",
  "huggingface",
  "arxiv",
  "reddit",
  "hackernews",
  "twitter",
  "other",
]);

// ─── Bookmark ───
export interface Bookmark {
  id: string;
  url: string;
  title: string;
  description: string;
  notes: string;
  platform: Platform;
  platformId: string;
  platformMetadata: Record<string, unknown>;
  faviconUrl: string;
  createdAt: string;
  updatedAt: string;
}

export const CreateBookmarkSchema = z.object({
  url: z.string().url(),
  title: z.string().default(""),
  description: z.string().default(""),
  notes: z.string().default(""),
  platform: PlatformSchema.default("other"),
  platformId: z.string().default(""),
  platformMetadata: z.record(z.unknown()).default({}),
  faviconUrl: z.string().default(""),
  tags: z.array(z.string()).default([]),
  collectionId: z.string().optional(),
});

export type CreateBookmarkInput = z.infer<typeof CreateBookmarkSchema>;

export const UpdateBookmarkSchema = CreateBookmarkSchema.partial();
export type UpdateBookmarkInput = z.infer<typeof UpdateBookmarkSchema>;

// ─── Tag ───
export interface Tag {
  id: string;
  name: string;
}

// ─── Collection ───
export interface Collection {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: string;
}

export const CreateCollectionSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().optional(),
});

// ─── Project ───
export type ProjectStatus = "active" | "paused" | "completed";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: number;
  deadline: string | null;
  createdAt: string;
}

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  status: z.enum(["active", "paused", "completed"]).default("active"),
  priority: z.number().int().min(0).max(5).default(3),
  deadline: z.string().optional(),
});

// ─── Schedule Entry ───
export interface ScheduleEntry {
  id: string;
  projectId: string;
  scheduledDate: string;
  durationMinutes: number;
  notes: string;
  completed: boolean;
  createdAt: string;
}

// ─── List query ───
export interface ListQuery {
  tag?: string;
  collectionId?: string;
  platform?: Platform;
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── API Response ───
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
