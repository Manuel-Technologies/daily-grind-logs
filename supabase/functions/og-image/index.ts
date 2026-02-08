import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get("postId");

    if (!postId) {
      return new Response(JSON.stringify({ error: "Missing postId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the post
    const { data: post, error: postError } = await supabase
      .from("logs")
      .select("id, content, image_url, image_urls, user_id, created_at")
      .eq("id", postId)
      .is("deleted_at", null)
      .is("hidden_at", null)
      .single();

    if (postError || !post) {
      return new Response(JSON.stringify({ error: "Post not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .eq("user_id", post.user_id)
      .single();

    // Prepare OG metadata
    const authorName = profile?.display_name || profile?.username || "User";
    const username = profile?.username || "unknown";
    
    // Truncate content for description (first 200 chars)
    const description = post.content.length > 200 
      ? post.content.substring(0, 200) + "..." 
      : post.content;
    
    // Get the first image if available
    const ogImage = post.image_urls?.[0] || post.image_url || profile?.avatar_url || null;

    const metadata = {
      title: `${authorName} (@${username}) on CommitLog`,
      description: description,
      image: ogImage,
      author: authorName,
      username: username,
      url: `https://daily-grind-logs.lovable.app/post/${postId}`,
    };

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("OG metadata error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
