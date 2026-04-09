-- Enum para status de campanhas
CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- Enum para status de automações
CREATE TYPE public.automation_status AS ENUM ('active', 'inactive', 'draft');

-- Enum para tipos de gatilho
CREATE TYPE public.automation_trigger AS ENUM ('new_client', 'appointment_completed', 'birthday', 'inactivity', 'points_reached', 'custom');

-- Enum para tipos de ação
CREATE TYPE public.automation_action AS ENUM ('send_whatsapp', 'send_sms', 'send_email', 'add_points', 'create_voucher', 'notify_staff');

-- Enum para tipo de comunicação
CREATE TYPE public.communication_type AS ENUM ('whatsapp', 'sms', 'email');

-- Enum para status de comunicação
CREATE TYPE public.communication_status AS ENUM ('pending', 'sent', 'delivered', 'failed', 'read');

-- Enum para status de pagamento de comissão
CREATE TYPE public.commission_payment_status AS ENUM ('pending', 'paid', 'cancelled');