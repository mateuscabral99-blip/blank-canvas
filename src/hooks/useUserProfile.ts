import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUserProfile() {
  const { user } = useAuth();
  const [nome, setNome] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetch = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nome")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data?.nome) {
        setNome(data.nome);
      }
    };

    fetch();
  }, [user?.id]);

  // Fallback: capitalize email prefix
  const fallbackName = user?.email
    ? user.email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Usuário";

  return { displayName: nome || fallbackName, email: user?.email || "" };
}
