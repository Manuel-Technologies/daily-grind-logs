import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const postId = url.searchParams.get("id");

    if (!postId) {
      return Response.redirect("https://daily-grind-logs.lovable.app", 302);
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
      return Response.redirect("https://daily-grind-logs.lovable.app", 302);
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
    const siteUrl = "https://daily-grind-logs.lovable.app";
    const postUrl = `${siteUrl}/post/${postId}`;
    
    // Truncate content for description (first 200 chars)
    const description = post.content.length > 200 
      ? post.content.substring(0, 200).replace(/[<>"'&]/g, '') + "..." 
      : post.content.replace(/[<>"'&]/g, '');
    
    const title = `${authorName} (@${username}) on CommitLog`.replace(/[<>"'&]/g, '');
    
    // Get the first image if available
    const ogImage = post.image_urls?.[0] || post.image_url || `${siteUrl}/logo.jpg`;

    // Generate HTML with proper OG tags
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <meta name="description" content="${description}">
  
  <!-- Open Graph -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="${postUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="CommitLog">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImage}">
  
  <!-- Redirect to actual app -->
  <meta http-equiv="refresh" content="0;url=${postUrl}">
  <link rel="canonical" href="${postUrl}">
</head>
<body>
  <p>Redirecting to <a href="${postUrl}">${postUrl}</a>...</p>
  <script>window.location.href = "${postUrl}";</script>
</body>
</html>`;

    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Post HTML error:", error);
    return Response.redirect("https://daily-grind-logs.lovable.app", 302);
  }
});
