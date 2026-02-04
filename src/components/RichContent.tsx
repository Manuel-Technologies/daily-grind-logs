import { Link } from "react-router-dom";
import { Fragment } from "react";

interface RichContentProps {
  content: string;
}

// Regex patterns
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
const MENTION_REGEX = /@([a-zA-Z0-9_]+)/g;

interface ContentPart {
  type: "text" | "url" | "mention";
  value: string;
  username?: string;
}

function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];
  let lastIndex = 0;

  // Combined regex for both URLs and mentions
  const combinedRegex = new RegExp(
    `(${URL_REGEX.source})|(${MENTION_REGEX.source})`,
    "g"
  );

  let match;
  while ((match = combinedRegex.exec(content)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    if (match[1]) {
      // URL match
      parts.push({
        type: "url",
        value: match[1],
      });
    } else if (match[2]) {
      // Mention match - match[3] is the username without @
      parts.push({
        type: "mention",
        value: match[2],
        username: match[3],
      });
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    parts.push({
      type: "text",
      value: content.slice(lastIndex),
    });
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
