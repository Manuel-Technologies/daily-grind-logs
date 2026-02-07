import { Link } from "react-router-dom";
import { Fragment } from "react";

interface RichContentProps {
  content: string;
}

interface ContentPart {
  type: "text" | "url" | "mention";
  value: string;
  username?: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  
  // Process content character by character to handle overlapping patterns
  let remaining = content;
  let currentIndex = 0;
  
  while (remaining.length > 0) {
    // Find the earliest match of either URL or mention
    const urlMatch = remaining.match(/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/);
    const mentionMatch = remaining.match(/^@([a-zA-Z0-9_]+)/);
    
    // Find position of next URL or mention
    const nextUrlPos = remaining.search(/https?:\/\/[^\s<]+[^<.,:;"')\]\s]/);
    const nextMentionPos = remaining.search(/@[a-zA-Z0-9_]+/);
    
    // Determine which comes first
    let firstMatchPos = -1;
    let matchType: "url" | "mention" | null = null;
    
    if (nextUrlPos !== -1 && (nextMentionPos === -1 || nextUrlPos < nextMentionPos)) {
      firstMatchPos = nextUrlPos;
      matchType = "url";
    } else if (nextMentionPos !== -1) {
      firstMatchPos = nextMentionPos;
      matchType = "mention";
    }
    
    if (firstMatchPos === -1) {
      // No more matches, add remaining as text
      if (remaining.length > 0) {
        parts.push({ type: "text", value: remaining });
      }
      break;
    }
    
    // Add text before the match
    if (firstMatchPos > 0) {
      parts.push({ type: "text", value: remaining.slice(0, firstMatchPos) });
      remaining = remaining.slice(firstMatchPos);
    }
    
    // Now extract the actual match from the start
    if (matchType === "url") {
      const match = remaining.match(/^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/);
      if (match) {
        parts.push({ type: "url", value: match[1] });
        remaining = remaining.slice(match[0].length);
      }
    } else if (matchType === "mention") {
      const match = remaining.match(/^@([a-zA-Z0-9_]+)/);
      if (match) {
        parts.push({ 
          type: "mention", 
          value: match[0], 
          username: match[1] 
        });
        remaining = remaining.slice(match[0].length);
      }
    }
  }
  
  return parts;
}

export function RichContent({ content }: RichContentProps) {
  const parts = parseContent(content);

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === "url") {
          return (
            <a
              key={index}
              href={part.value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part.value}
            </a>
          );
        }

        if (part.type === "mention" && part.username) {
          return (
            <Link
              key={index}
              to={`/profile/${part.username}`}
              className="text-primary hover:underline font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              @{part.username}
            </Link>
          );
        }

        return <Fragment key={index}>{part.value}</Fragment>;
      })}
    </>
  );
}
