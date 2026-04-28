"use client";

import Link from "next/link";
import { Bookmark, ChevronDown, ChevronUp, ImagePlus, MessageCircle, Search, Send, Sparkles, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProductShell from "@/components/product/ProductShell";
import { communityTags, type CommentNode, type CommunityTag } from "@/data/product-system";
import { getFilteredPosts, useProductStore } from "@/lib/product-store";

function CommentThread({ comment, postId, depth = 0 }: { comment: CommentNode; postId: string; depth?: number }) {
  const [replying, setReplying] = useState(false);
  const [body, setBody] = useState("");
  const collapsed = useProductStore((state) => state.collapsedComments[comment.id]);
  const toggleComment = useProductStore((state) => state.toggleComment);
  const addReply = useProductStore((state) => state.addReply);

  return (
    <div className="comment-thread" style={{ marginLeft: depth ? 18 : 0 }}>
      <div className="comment-card">
        <button className="comment-collapse" type="button" onClick={() => toggleComment(comment.id)} aria-label="Collapse comment">
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
        <div className="avatar small">{comment.avatar}</div>
        <div>
          <div className="comment-meta">
            <strong>{comment.author}</strong>
            <span>{comment.createdAt}</span>
            <span>{comment.score} pts</span>
          </div>
          {!collapsed && <p>{comment.body}</p>}
          {!collapsed && (
            <button className="reply-link" type="button" onClick={() => setReplying((value) => !value)}>
              Reply
            </button>
          )}
        </div>
      </div>
      {!collapsed && replying && (
        <form
          className="inline-reply"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!body.trim()) return;
            try {
              await addReply(postId, comment.id, body);
              setBody("");
              setReplying(false);
            } catch {
              setReplying(true);
            }
          }}
        >
          <input value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write a thoughtful reply..." />
          <button type="submit" aria-label="Send reply">
            <Send size={15} />
          </button>
        </form>
      )}
      {!collapsed && comment.replies?.map((reply) => <CommentThread comment={reply} postId={postId} depth={depth + 1} key={reply.id} />)}
    </div>
  );
}

export default function CommunityExperience() {
  const rawPosts = useProductStore((state) => state.posts);
  const loading = useProductStore((state) => state.communityLoading);
  const error = useProductStore((state) => state.communityError);
  const sort = useProductStore((state) => state.sort);
  const tag = useProductStore((state) => state.tag);
  const query = useProductStore((state) => state.query);
  const loadPosts = useProductStore((state) => state.loadPosts);
  const setSort = useProductStore((state) => state.setSort);
  const setTag = useProductStore((state) => state.setTag);
  const setQuery = useProductStore((state) => state.setQuery);
  const createPost = useProductStore((state) => state.createPost);
  const votePost = useProductStore((state) => state.votePost);
  const addReply = useProductStore((state) => state.addReply);
  const toggleBookmark = useProductStore((state) => state.toggleBookmark);
  const bookmarks = useProductStore((state) => state.bookmarkedPosts);
  const [draft, setDraft] = useState({ title: "", description: "", tag: "Workflows" as CommunityTag, media: "" });
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const posts = useMemo(() => getFilteredPosts(rawPosts, sort, tag, query), [rawPosts, sort, tag, query]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  return (
    <ProductShell
      eyebrow="Community"
      title="Share workflows, ask questions, and improve automations together."
      description="A focused community space for workflow showcases, macro recipes, bug reports, product ideas, docs references, and practical implementation help."
      aside={
        <>
          <div className="aside-panel">
            <strong>Top contributors</strong>
            {["Mira Chen", "Arjun Patel", "Sam Rivera"].map((name, index) => (
              <div className="contributor-row" key={name}>
                <div className="avatar small">{name.split(" ").map((part) => part[0]).join("")}</div>
                <span>{name}</span>
                <small>{284 - index * 57} pts</small>
              </div>
            ))}
          </div>
          <div className="aside-panel">
            <strong>Community links</strong>
            <Link href="/features">Explore features</Link>
            <Link href="/docs">Read docs</Link>
            <Link href="/docs#commands">Command safety</Link>
          </div>
        </>
      }
    >
      <section className="community-overview">
        <div>
          <span>Community pulse</span>
          <strong>{rawPosts.length}</strong>
          <p>Active posts across workflows, macros, bugs, ideas, and showcases.</p>
        </div>
        <div>
          <span>Bookmarked</span>
          <strong>{bookmarks.length}</strong>
          <p>Saved discussions stay close while you refine your own flows.</p>
        </div>
        <div>
          <span>Focus</span>
          <strong>Practical</strong>
          <p>Every post can point back to features and docs for faster answers.</p>
        </div>
      </section>

      <section className="composer-card">
        <div className="composer-head">
          <div className="avatar">YO</div>
          <div>
            <strong>Create a post</strong>
            <p>Ask a question, share a workflow, or reference a docs page.</p>
          </div>
        </div>
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!draft.title.trim() || !draft.description.trim()) return;
            try {
              await createPost(draft);
              setDraft({ title: "", description: "", tag: "Workflows", media: "" });
            } catch {
              // The store keeps the previous Mongo-loaded list visible if the write fails.
            }
          }}
        >
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Post title" />
          <textarea
            value={draft.description}
            onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            placeholder="Describe the workflow, macro, bug, or idea..."
          />
          <div className="composer-actions">
            <select value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value as CommunityTag })}>
              {communityTags.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <label>
              <ImagePlus size={16} />
              <input value={draft.media} onChange={(event) => setDraft({ ...draft, media: event.target.value })} placeholder="Optional media" />
            </label>
            <button type="submit">
              <Send size={16} />
              Post
            </button>
          </div>
        </form>
      </section>

      <div className="feed-panel">
        <div className="discussion-toolbar">
          <div className="feed-title">
            <Users size={18} />
            <strong>Community feed</strong>
          </div>
          <div className="segmented-control">
            {(["Top", "New", "Trending"] as const).map((mode) => (
              <button className={sort === mode ? "active" : ""} type="button" onClick={() => setSort(mode)} key={mode}>
                {mode}
              </button>
            ))}
          </div>
          <div className="feed-search">
            <Search size={16} />
            <input onChange={(event) => setQuery(event.target.value)} placeholder="Filter posts..." aria-label="Filter community posts" />
          </div>
        </div>

        <div className="tag-row">
          {(["All", ...communityTags] as const).map((item) => (
            <button className={tag === item ? "active" : ""} type="button" onClick={() => setTag(item)} key={item}>
              {item}
            </button>
          ))}
        </div>
      </div>

      {(loading || error) && (
        <div className="community-status">
          {loading ? "Loading posts from MongoDB..." : error}
        </div>
      )}

      <section className="post-list">
        {posts.map((post) => (
          <article className="post-card" id={post.id} key={post.id}>
            <div className="vote-rail">
              <button type="button" onClick={() => void votePost(post.id, 1)} aria-label="Upvote">
                <ChevronUp size={18} />
              </button>
              <strong>{post.score}</strong>
              <button type="button" onClick={() => void votePost(post.id, -1)} aria-label="Downvote">
                <ChevronDown size={18} />
              </button>
            </div>
            <div className="post-body">
              <div className="post-meta">
                <span>{post.tag}</span>
                <span>Posted by {post.author}</span>
                <span>{post.createdAt}</span>
              </div>
              <h2>{post.title}</h2>
              <p>{post.description}</p>
              {post.media && <div className="media-pill">{post.media}</div>}
              <div className="reference-row">
                {post.relatedFeatures.map((feature) => (
                  <Link href={`/features#${feature}`} key={feature}>Feature: {feature}</Link>
                ))}
                {post.relatedDocs.map((doc) => (
                  <Link href={`/docs#${doc}`} key={doc}>Doc: {doc}</Link>
                ))}
              </div>
              <div className="post-actions">
                <span>
                  <MessageCircle size={16} />
                  {post.comments.length} comments
                </span>
                <button type="button" onClick={() => toggleBookmark(post.id)}>
                  <Bookmark size={16} fill={bookmarks.includes(post.id) ? "currentColor" : "none"} />
                  Bookmark
                </button>
                <button type="button">
                  <Sparkles size={16} />
                  AI polish
                </button>
              </div>
              <form
                className="inline-reply root"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const body = replyDrafts[post.id] ?? "";
                  if (!body.trim()) return;
                  try {
                    await addReply(post.id, null, body);
                    setReplyDrafts({ ...replyDrafts, [post.id]: "" });
                  } catch {
                    setReplyDrafts({ ...replyDrafts, [post.id]: body });
                  }
                }}
              >
                <input
                  value={replyDrafts[post.id] ?? ""}
                  onChange={(event) => setReplyDrafts({ ...replyDrafts, [post.id]: event.target.value })}
                  placeholder="Add a comment..."
                />
                <button type="submit" aria-label="Send comment">
                  <Send size={15} />
                </button>
              </form>
              <div className="comments">
                {post.comments.map((comment) => (
                  <CommentThread comment={comment} postId={post.id} key={comment.id} />
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </ProductShell>
  );
}
