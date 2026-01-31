import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Profile } from "@/types";

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId || !profile) return { error: new Error("No user") };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", userId);

    if (!error) {
      setProfile({ ...profile, ...updates });
    }

    return { error };
  };

  return { profile, loading, updateProfile };
}

export function useProfileByUsername(username: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
      } else {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [username]);

  return { profile, loading };
}
