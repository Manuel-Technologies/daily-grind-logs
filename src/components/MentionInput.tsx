import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

interface SuggestionUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  maxLength,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestionUser[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detect @ symbol and extract query
  const detectMention = useCallback((text: string, cursorPos: number) => {
    // Look backwards from cursor to find @
    let start = cursorPos - 1;
    while (start >= 0 && text[start] !== "@" && text[start] !== " " && text[start] !== "\n") {
      start--;
    }

    if (start >= 0 && text[start] === "@") {
      // Check if @ is at start or preceded by space/newline
      if (start === 0 || text[start - 1] === " " || text[start - 1] === "\n") {
        const query = text.slice(start + 1, cursorPos);
        if (query.length > 0 && !query.includes(" ")) {
          return { query, startIndex: start };
        }
      }
    }
    return null;
  }, []);

  // Search users
  useEffect(() => {
    if (!mentionQuery) {
      setSuggestions([]);
      return;
    }

    const searchUsers = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .ilike("username", `${mentionQuery}%`)
        .limit(5);

      setSuggestions((data as SuggestionUser[]) || []);
      setSelectedIndex(0);
    };

    const debounce = setTimeout(searchUsers, 150);
    return () => clearTimeout(debounce);
  }, [mentionQuery]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);

    const mention = detectMention(newValue, cursorPos);
    if (mention) {
      setMentionQuery(mention.query);
      setMentionStartIndex(mention.startIndex);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setMentionQuery("");
      setMentionStartIndex(-1);
    }
  };

  const insertMention = (user: SuggestionUser) => {
    if (mentionStartIndex === -1) return;

    const before = value.slice(0, mentionStartIndex);
    const cursorPos = textareaRef.current?.selectionStart || value.length;
    const after = value.slice(cursorPos);

    const newValue = `${before}@${user.username} ${after}`;
    onChange(newValue);

    setShowSuggestions(false);
    setMentionQuery("");
    setMentionStartIndex(-1);

    // Focus back and set cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = mentionStartIndex + user.username.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && showSuggestions) {
      e.preventDefault();
      insertMention(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "min-h-[100px] bg-transparent border-0 resize-none text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:outline-none w-full p-0",
          className
        )}
        maxLength={maxLength}
      />

      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-64 bg-popover border border-border rounded-lg shadow-lg overflow-hidden"
          style={{ top: "100%", left: 0 }}
        >
          {suggestions.map((user, index) => (
            <button
              key={user.user_id}
              onClick={() => insertMention(user)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors",
                index === selectedIndex && "bg-accent"
              )}
            >
              <Avatar className="w-6 h-6">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="text-xs bg-secondary text-secondary-foreground">
                  {user.username.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {user.display_name || user.username}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  @{user.username}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
