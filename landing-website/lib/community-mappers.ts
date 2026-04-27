import type { CommentNode, CommunityPost, CommunityTag } from "@/data/product-system";

type MongoComment = {
  _id?: { toString: () => string };
  id?: string;
  author?: string;
  avatar?: string;
  body?: string;
  score?: number;
  createdAt?: Date | string;
  replies?: MongoComment[];
};

type MongoPost = {
  _id?: { toString: () => string };
  id?: string;
  title?: string;
  description?: string;
  tag?: CommunityTag;
  author?: string;
  avatar?: string;
  score?: number;
  media?: string;
  relatedDocs?: string[];
  relatedFeatures?: string[];
  comments?: MongoComment[];
  createdAt?: Date | string;
};

function relativeTime(value: Date | string | undefined) {
  if (!value) return "now";
  const date = value instanceof Date ? value : new Date(value);
  const seconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function mapCommunityComment(comment: MongoComment): CommentNode {
  return {
    id: comment.id || comment._id?.toString() || crypto.randomUUID(),
    author: comment.author || "Community member",
    avatar: comment.avatar || "CM",
    body: comment.body || "",
    score: comment.score ?? 1,
    createdAt: relativeTime(comment.createdAt),
    replies: (comment.replies ?? []).map(mapCommunityComment),
  };
}

export function mapCommunityPost(post: MongoPost): CommunityPost {
  return {
    id: post.id || post._id?.toString() || crypto.randomUUID(),
    title: post.title || "Untitled post",
    description: post.description || "",
    tag: post.tag || "Workflows",
    author: post.author || "Community member",
    avatar: post.avatar || "CM",
    score: post.score ?? 1,
    createdAt: relativeTime(post.createdAt),
    media: post.media || "",
    relatedDocs: post.relatedDocs ?? [],
    relatedFeatures: post.relatedFeatures ?? [],
    comments: (post.comments ?? []).map(mapCommunityComment),
  };
}

