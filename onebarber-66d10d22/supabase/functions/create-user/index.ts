import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  phone?: string;
  status?: string;
  role_id?: string;
  roleName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: requestingUser }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    const { data: isAdmin } = await supabaseUser.rpc('is_admin', { _user_id: requestingUser.id });
    const { data: hasPermission } = await supabaseUser.rpc('has_permission', { 
      _user_id: requestingUser.id, 
      _module: 'users', 
      _action: 'create' 
    });

    if (!isAdmin && !hasPermission) {
      throw new Error("Sem permissão para criar usuários");
    }

    const body: CreateUserRequest = await req.json();
    
    if (!body.email || !body.password || !body.fullName) {
      throw new Error("Email, senha e nome são obrigatórios");
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Create user using Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.fullName },
    });

    if (createError) {
      throw createError;
    }

    if (!newUser.user) {
      throw new Error("Falha ao criar usuário");
    }

    // Update profile with additional fields
    await supabaseAdmin
      .from('profiles')
      .update({
        full_name: body.fullName,
        username: body.username || null,
        phone: body.phone || null,
        status: body.status || 'active',
      })
      .eq('user_id', newUser.user.id);

    // Get role by name or id
    let roleId = body.role_id;
    if (!roleId && body.roleName) {
      const { data: roleData } = await supabaseAdmin
        .from('roles')
        .select('id')
        .eq('name', body.roleName)
        .single();
      
      if (roleData) {
        roleId = roleData.id;
      }
    }

    // Update role if provided
    if (roleId) {
      // First check if user already has a role assigned
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', newUser.user.id)
        .single();

      if (existingRole) {
        await supabaseAdmin
          .from('user_roles')
          .update({ role_id: roleId })
          .eq('user_id', newUser.user.id);
      } else {
        await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUser.user.id, role_id: roleId });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: newUser.user.id, 
          email: newUser.user.email 
        } 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error("Error creating user:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Erro ao criar usuário" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400 
      }
    );
  }
});
