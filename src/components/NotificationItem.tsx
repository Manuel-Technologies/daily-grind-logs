import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Repeat2, UserPlus, AtSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Notification } from "@/hooks/useNotifications";

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

const iconMap = {
  like: Heart,
  comment: MessageCircle,
  relog: Repeat2,
  follow: UserPlus,
  mention: AtSign,
};

const messageMap = {
  like: "liked your log",
  comment: "commented on your log",
  relog: "relogged your log",
  follow: "started following you",
  mention: "mentioned you",
};

export function NotificationItem({ notification, onClose }: NotificationItemProps) {
  const Icon = iconMap[notification.type as keyof typeof iconMap] || Heart;
  const message = messageMap[notification.type as keyof typeof messageMap] || "interacted with you";

  const link = notification.type === "follow"
    ? `/profile/${notification.actor?.username}`
    : notification.log_id
    ? "/" // Could link to specific log if we had a log detail page
    : "/";

  return (
    <Link
      to={link}
      onClick={onClose}
      className={cn(
        "flex items-start gap-3 p-4 hover:bg-accent/50 transition-colors",
        !notification.read_at && "bg-accent/20"
      )}
    >
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={notification.actor?.avatar_url || undefined} />
        <AvatarFallback className="bg-secondary text-secondary-foreground">
          {notification.actor?.username?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-medium">
              {notification.actor?.display_name || notification.actor?.username}
            </span>{" "}
            {message}
          </p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
        </p>
      </div>

      {!notification.read_at && (
        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
      )}
    </Link>
  );
}
