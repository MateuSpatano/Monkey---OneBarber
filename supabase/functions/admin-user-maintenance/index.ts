import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type JsonResponse = {
  success: boolean;
  error?: string;
  created?: { id: string; email: string | null };
  deleted?: { email: string; user_id?: string }[];
};

interface RequestBody {
  create: {
    email: string;
    password: string;
    fullName: string;
  };
  deleteEmails?: string[];
}

async function getOrCreateAdminRoleId(supabaseAdmin: any) {
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("roles")
    .select("id")
    .eq("name", "Administrador")
    .maybeSingle();

  if (roleError) throw roleError;
  if (roleData?.id) return roleData.id as string;

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("roles")
    .insert({ name: "Administrador", description: "Acesso total ao sistema", is_system: true })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return inserted.id as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Missing authorization header" } satisfies JsonResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: requestingUser },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !requestingUser) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" } satisfies JsonResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: isAdmin, error: isAdminError } = await supabaseUser.rpc("is_admin", {
      _user_id: requestingUser.id,
    });

    if (isAdminError) throw isAdminError;
    if (!isAdmin) {
      return new Response(JSON.stringify({ success: false, error: "Sem permissão" } satisfies JsonResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const body: RequestBody = await req.json();
    if (!body?.create?.email || !body?.create?.password || !body?.create?.fullName) {
      return new Response(JSON.stringify({ success: false, error: "Payload inválido" } satisfies JsonResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const adminRoleId = await getOrCreateAdminRoleId(supabaseAdmin);

    // 1) Create the new admin user first
    const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.create.email,
      password: body.create.password,
      email_confirm: true,
      user_metadata: { full_name: body.create.fullName },
    });

    if (createError) throw createError;
    if (!newUserData.user) throw new Error("Falha ao criar usuário");

    const newUserId = newUserData.user.id;

    // Ensure profile data
    await supabaseAdmin
      .from("profiles")
      .update({ full_name: body.create.fullName, status: "active" })
      .eq("user_id", newUserId);

    // IMPORTANT: the DB trigger assigns default role to new signups.
    // Here we force the admin to have ONLY the Administrador role.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    await supabaseAdmin.from("user_roles").insert({ user_id: newUserId, role_id: adminRoleId });

    // 2) Delete requested users
    const deleted: { email: string; user_id?: string }[] = [];
    for (const email of body.deleteEmails ?? []) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      const userId = profile?.user_id as string | undefined;

      if (userId) {
        await supabaseAdmin.from("user_roles").delete().eq("user_id", userId);
        await supabaseAdmin.from("profiles").delete().eq("user_id", userId);
        await supabaseAdmin.from("professionals").delete().eq("user_id", userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        deleted.push({ email, user_id: userId });
      } else {
        deleted.push({ email });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        created: { id: newUserId, email: newUserData.user.email ?? null },
        deleted,
      } satisfies JsonResponse),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("admin-user-maintenance error:", error);
    return new Response(JSON.stringify({ success: false, error: error?.message ?? "Erro" } satisfies JsonResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
