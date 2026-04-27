"use client";

import { create } from "zustand";
import { communityPosts, docs, features, type CommentNode, type CommunityPost, type CommunityTag } from "@/data/product-system";

type SortMode = "Top" | "New" | "Trending";
type ThemeMode = "light" | "dark";

type SearchResult = {
  id: string;
  type: "Community" | "Feature" | "Docs";
  title: string;
  description: string;
  href: string;
};

type ProductState = {
  posts: CommunityPost[];
  communityLoading: boolean;
  communityError: string | null;
  sort: SortMode;
  tag: CommunityTag | "All";
  query: string;
  docsQuery: string;
  collapsedComments: Record<string, boolean>;
  bookmarkedPosts: string[];
  theme: ThemeMode;
  setSort: (sort: SortMode) => void;
  setTag: (tag: CommunityTag | "All") => void;
  setQuery: (query: string) => void;
  setDocsQuery: (query: string) => void;
  setTheme: (theme: ThemeMode) => void;
  loadPosts: () => Promise<void>;
  createPost: (post: { title: string; description: string; tag: CommunityTag; media?: string }) => Promise<void>;
  votePost: (id: string, delta: 1 | -1) => Promise<void>;
  addReply: (postId: string, commentId: string | null, body: string) => Promise<void>;
  toggleComment: (commentId: string) => void;
  toggleBookmark: (postId: string) => void;
};

function addReplyToComment(comments: CommentNode[], commentId: string, reply: CommentNode): CommentNode[] {
  return comments.map((comment) => {
    if (comment.id === commentId) {
      return { ...comment, replies: [...(comment.replies ?? []), reply] };
    }

    if (comment.replies?.length) {
      return { ...comment, replies: addReplyToComment(comment.replies, commentId, reply) };
    }

    return comment;
  });
}

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.trim().toLowerCase());
}

export const useProductStore = create<ProductState>((set, get) => ({
  posts: communityPosts,
  communityLoading: false,
  communityError: null,
  sort: "Top",
  tag: "All",
  query: "",
  docsQuery: "",
  collapsedComments: {},
  bookmarkedPosts: [],
  theme: "light",

  setSort: (sort) => set({ sort }),
  setTag: (tag) => set({ tag }),
  setQuery: (query) => set({ query }),
  setDocsQuery: (docsQuery) => set({ docsQuery }),
  setTheme: (theme) => set({ theme }),

  loadPosts: async () => {
    const { sort, tag, query } = get();
    const params = new URLSearchParams({ sort, tag });
    if (query.trim()) params.set("query", query.trim());

    set({ communityLoading: true, communityError: null });
    try {
      const response = await fetch(`/api/community/posts?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Could not load community posts.");
      }
      const body = (await response.json()) as { posts: CommunityPost[] };
      set({ posts: body.posts, communityLoading: false });
    } catch (error) {
      set({
        communityError: error instanceof Error ? error.message : "Could not load community posts.",
        communityLoading: false,
      });
    }
  },

  createPost: async ({ title, description, tag, media }) => {
    const response = await fetch("/api/community/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, tag, media, author: "You", avatar: "YO" }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error || "Could not create post.");
    }

    const body = (await response.json()) as { post: CommunityPost };
    set((state) => ({ posts: [body.post, ...state.posts] }));
  },

  votePost: async (id, delta) => {
    set((state) => ({
      posts: state.posts.map((post) => (post.id === id ? { ...post, score: post.score + delta } : post)),
    }));

    const response = await fetch(`/api/community/posts/${id}/vote`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });

    if (!response.ok) {
      set((state) => ({
        posts: state.posts.map((post) => (post.id === id ? { ...post, score: post.score - delta } : post)),
      }));
    }
  },

  addReply: async (postId, commentId, body) => {
    const response = await fetch(`/api/community/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId, body, author: "You", avatar: "YO" }),
    });

    if (!response.ok) {
      const responseBody = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(responseBody?.error || "Could not add reply.");
    }

    const responseBody = (await response.json()) as { comment: CommentNode };

    set((state) => ({
      posts: state.posts.map((post) => {
        if (post.id !== postId) return post;
        if (!commentId) return { ...post, comments: [...post.comments, responseBody.comment] };
        return { ...post, comments: addReplyToComment(post.comments, commentId, responseBody.comment) };
      }),
    }));
  },

  toggleComment: (commentId) =>
    set((state) => ({
      collapsedComments: {
        ...state.collapsedComments,
        [commentId]: !state.collapsedComments[commentId],
      },
    })),

  toggleBookmark: (postId) =>
    set((state) => ({
      bookmarkedPosts: state.bookmarkedPosts.includes(postId)
        ? state.bookmarkedPosts.filter((id) => id !== postId)
        : [...state.bookmarkedPosts, postId],
    })),

}));

export function getFilteredPosts(posts: CommunityPost[], sort: SortMode, tag: CommunityTag | "All", query: string) {
  const filtered = posts.filter((post) => {
    const tagMatches = tag === "All" || post.tag === tag;
    const queryMatches = !query.trim() || matchesQuery(`${post.title} ${post.description} ${post.author} ${post.tag}`, query);
    return tagMatches && queryMatches;
  });

  return [...filtered].sort((left, right) => {
    if (sort === "New") return left.createdAt === "now" ? -1 : right.createdAt === "now" ? 1 : 0;
    if (sort === "Trending") return right.comments.length * 24 + right.score - (left.comments.length * 24 + left.score);
    return right.score - left.score;
  });
}

export function getGlobalResults(posts: CommunityPost[], query: string): SearchResult[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const community = posts
    .filter((post) => matchesQuery(`${post.title} ${post.description} ${post.tag}`, trimmed))
    .map((post) => ({
      id: post.id,
      type: "Community" as const,
      title: post.title,
      description: post.description,
      href: `/community#${post.id}`,
    }));

  const featureResults = features
    .filter((feature) => matchesQuery(`${feature.title} ${feature.description}`, trimmed))
    .map((feature) => ({
      id: feature.id,
      type: "Feature" as const,
      title: feature.title,
      description: feature.description,
      href: `/features#${feature.id}`,
    }));

  const docResults = docs
    .filter((doc) => matchesQuery(`${doc.title} ${doc.description} ${doc.section} ${doc.steps.join(" ")}`, trimmed))
    .map((doc) => ({
      id: doc.id,
      type: "Docs" as const,
      title: doc.title,
      description: doc.description,
      href: `/docs#${doc.id}`,
    }));

  return [...community, ...featureResults, ...docResults].slice(0, 8);
}
