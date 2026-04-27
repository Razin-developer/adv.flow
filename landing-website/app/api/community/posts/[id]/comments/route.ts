import { NextRequest, NextResponse } from "next/server";
import { mapCommunityComment } from "@/lib/community-mappers";
import { connectToMongo } from "@/lib/mongoose";
import { CommunityPost } from "@/models/CommunityPost";

type MutableComment = {
  _id?: { toString: () => string };
  id?: string;
  author: string;
  avatar: string;
  body: string;
  score: number;
  createdAt: Date;
  replies?: MutableComment[];
};

function addNestedReply(comments: MutableComment[], commentId: string, reply: MutableComment): boolean {
  for (const comment of comments) {
    const id = comment.id || comment._id?.toString();
    if (id === commentId) {
      comment.replies = [...(comment.replies ?? []), reply];
      return true;
    }

    if (comment.replies?.length && addNestedReply(comment.replies, commentId, reply)) {
      return true;
    }
  }

  return false;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as {
    commentId?: string | null;
    body?: string;
    author?: string;
    avatar?: string;
  };

  if (!body.body?.trim()) {
    return NextResponse.json({ error: "Comment body is required." }, { status: 400 });
  }

  await connectToMongo();

  const post = await CommunityPost.findById(id);
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const comment = {
    id: crypto.randomUUID(),
    author: body.author?.trim() || "Community member",
    avatar: body.avatar?.trim() || "CM",
    body: body.body.trim(),
    score: 1,
    createdAt: new Date(),
    replies: [],
  };

  if (body.commentId) {
    const comments = post.comments as MutableComment[];
    if (!addNestedReply(comments, body.commentId, comment)) {
      return NextResponse.json({ error: "Parent comment not found." }, { status: 404 });
    }
    post.markModified("comments");
  } else {
    post.comments.push(comment);
  }

  await post.save();

  return NextResponse.json({ comment: mapCommunityComment(comment) }, { status: 201 });
}

