import { NextRequest, NextResponse } from "next/server";
import type { SortOrder } from "mongoose";
import { mapCommunityPost } from "@/lib/community-mappers";
import { connectToMongo } from "@/lib/mongoose";
import { CommunityPost } from "@/models/CommunityPost";

const allowedTags = new Set(["Workflows", "Macros", "Bugs", "Ideas", "Showcase"]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get("tag");
  const query = searchParams.get("query")?.trim();
  const sort = searchParams.get("sort") || "Top";

  await connectToMongo();

  const filter: Record<string, unknown> = {};
  if (tag && tag !== "All" && allowedTags.has(tag)) filter.tag = tag;
  if (query) filter.$text = { $search: query };

  const sortBy: Record<string, SortOrder> =
    sort === "New" ? { createdAt: -1 } : sort === "Trending" ? { score: -1, updatedAt: -1 } : { score: -1 };
  const posts = await CommunityPost.find(filter).sort(sortBy).limit(50).lean();

  return NextResponse.json({ posts: posts.map(mapCommunityPost) });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    title?: string;
    description?: string;
    tag?: string;
    media?: string;
    author?: string;
    avatar?: string;
    relatedDocs?: string[];
    relatedFeatures?: string[];
  };

  if (!body.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "Title and description are required." }, { status: 400 });
  }

  if (!body.tag || !allowedTags.has(body.tag)) {
    return NextResponse.json({ error: "A valid tag is required." }, { status: 400 });
  }

  await connectToMongo();

  const post = await CommunityPost.create({
    title: body.title.trim(),
    description: body.description.trim(),
    tag: body.tag,
    media: body.media?.trim() ?? "",
    author: body.author?.trim() || "Community member",
    avatar: body.avatar?.trim() || "CM",
    relatedDocs: body.relatedDocs ?? [],
    relatedFeatures: body.relatedFeatures ?? [],
  });

  return NextResponse.json({ post: mapCommunityPost(post.toObject()) }, { status: 201 });
}
