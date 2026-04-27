import { NextRequest, NextResponse } from "next/server";
import { mapCommunityPost } from "@/lib/community-mappers";
import { connectToMongo } from "@/lib/mongoose";
import { CommunityPost } from "@/models/CommunityPost";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await request.json()) as { delta?: number };
  const delta = body.delta === -1 ? -1 : 1;

  await connectToMongo();

  const post = await CommunityPost.findByIdAndUpdate(id, { $inc: { score: delta } }, { new: true }).lean();
  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  return NextResponse.json({ post: mapCommunityPost(post) });
}

