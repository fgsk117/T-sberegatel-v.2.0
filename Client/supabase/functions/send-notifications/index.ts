import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*, users!inner(username)')
      .eq('status', 'pending')
      .lte('cooling_until', now.toISOString());

    if (purchasesError) throw purchasesError;

    const notifications: any[] = [];

    for (const purchase of purchases || []) {
      const { data: settings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', purchase.user_id)
        .maybeSingle();

      if (!settings || !settings.enabled) continue;

      if (settings.exclude_categories.includes(purchase.category)) continue;

      const shouldNotify = checkNotificationFrequency(
        settings.last_notification_sent,
        settings.frequency
      );

      if (shouldNotify) {
        notifications.push({
          userId: purchase.user_id,
          username: purchase.users.username,
          purchaseName: purchase.name,
          purchasePrice: purchase.price,
          purchaseCategory: purchase.category,
        });

        await supabase
          .from('notification_settings')
          .update({ last_notification_sent: now.toISOString() })
          .eq('user_id', purchase.user_id);

        await supabase
          .from('purchases')
          .update({ status: 'cooled' })
          .eq('id', purchase.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notifications.length,
        notifications,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error sending notifications:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

function checkNotificationFrequency(
  lastSent: string | null,
  frequency: string
): boolean {
  if (!lastSent) return true;

  const last = new Date(lastSent);
  const now = new Date();
  const diffMs = now.getTime() - last.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (frequency) {
    case 'daily':
      return diffDays >= 1;
    case 'weekly':
      return diffDays >= 7;
    case 'monthly':
      return diffDays >= 30;
    default:
      return false;
  }
}
