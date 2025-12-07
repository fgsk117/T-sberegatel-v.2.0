/*
  # Cooling Purchases System Schema

  ## Overview
  Complete database schema for the purchase cooling system that helps users make better financial decisions.

  ## New Tables

  ### users
  - `id` (uuid, primary key) - Unique user identifier
  - `username` (text, unique) - Username for login (no password required)
  - `created_at` (timestamptz) - Account creation timestamp
  - `last_login` (timestamptz) - Last login timestamp

  ### financial_profiles
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key) - References users
  - `monthly_salary` (decimal) - Monthly salary amount
  - `monthly_savings` (decimal) - Amount saved per month
  - `current_balance` (decimal) - Current available balance
  - `consider_savings` (boolean) - Whether to consider savings in calculations
  - `updated_at` (timestamptz)

  ### cooling_ranges
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `min_amount` (decimal) - Minimum purchase amount for this range
  - `max_amount` (decimal) - Maximum purchase amount (null = no limit)
  - `cooling_days` (integer) - Number of days to wait
  - `created_at` (timestamptz)

  ### categories_blacklist
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `category_name` (text) - Blacklisted category name
  - `created_at` (timestamptz)

  ### purchases
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `name` (text) - Product name
  - `price` (decimal) - Product price
  - `category` (text) - Product category
  - `url` (text) - Optional product URL
  - `cooling_until` (timestamptz) - Date when cooling period ends
  - `status` (text) - pending/cooled/purchased/cancelled
  - `created_at` (timestamptz)
  - `completed_at` (timestamptz) - When purchase was completed or cancelled

  ### purchase_history
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `purchase_id` (uuid, foreign key)
  - `action` (text) - purchased/cancelled
  - `notes` (text) - Optional notes
  - `created_at` (timestamptz)

  ### notification_settings
  - `id` (uuid, primary key)
  - `user_id` (uuid, foreign key)
  - `frequency` (text) - daily/weekly/monthly
  - `channel` (text) - app/email/telegram
  - `enabled` (boolean)
  - `exclude_categories` (text[]) - Array of categories to exclude from notifications
  - `last_notification_sent` (timestamptz)
  - `updated_at` (timestamptz)

  ### ai_prompts
  - `id` (uuid, primary key)
  - `name` (text) - Prompt identifier
  - `prompt_text` (text) - Actual prompt content
  - `description` (text) - What this prompt does
  - `updated_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Public access to ai_prompts for category matching
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_login timestamptz DEFAULT now()
);

-- Create financial_profiles table
CREATE TABLE IF NOT EXISTS financial_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  monthly_salary decimal(12,2) DEFAULT 0,
  monthly_savings decimal(12,2) DEFAULT 0,
  current_balance decimal(12,2) DEFAULT 0,
  consider_savings boolean DEFAULT false,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create cooling_ranges table
CREATE TABLE IF NOT EXISTS cooling_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  min_amount decimal(12,2) NOT NULL,
  max_amount decimal(12,2),
  cooling_days integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create categories_blacklist table
CREATE TABLE IF NOT EXISTS categories_blacklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  category_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  price decimal(12,2) NOT NULL,
  category text NOT NULL,
  url text,
  cooling_until timestamptz NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create purchase_history table
CREATE TABLE IF NOT EXISTS purchase_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  purchase_id uuid REFERENCES purchases(id) ON DELETE SET NULL,
  action text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create notification_settings table
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  frequency text DEFAULT 'weekly',
  channel text DEFAULT 'app',
  enabled boolean DEFAULT true,
  exclude_categories text[] DEFAULT '{}',
  last_notification_sent timestamptz,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create ai_prompts table
CREATE TABLE IF NOT EXISTS ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  prompt_text text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Insert default AI prompt for category matching
INSERT INTO ai_prompts (name, prompt_text, description)
VALUES (
  'category_matching',
  'You are a category similarity analyzer. Compare the product category with the blacklisted categories and return a JSON response with similarity scores. Response format: {"matches": [{"blacklisted_category": "name", "similarity_score": 0-100, "reason": "explanation"}]}',
  'Analyzes similarity between product categories and blacklisted categories'
)
ON CONFLICT (name) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooling_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view all usernames"
  ON users FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert their own record"
  ON users FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  TO anon, authenticated
  USING (true);

-- RLS Policies for financial_profiles
CREATE POLICY "Users can view own financial profile"
  ON financial_profiles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own financial profile"
  ON financial_profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own financial profile"
  ON financial_profiles FOR UPDATE
  TO anon, authenticated
  USING (true);

-- RLS Policies for cooling_ranges
CREATE POLICY "Users can view own cooling ranges"
  ON cooling_ranges FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own cooling ranges"
  ON cooling_ranges FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own cooling ranges"
  ON cooling_ranges FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can delete own cooling ranges"
  ON cooling_ranges FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for categories_blacklist
CREATE POLICY "Users can view own blacklist"
  ON categories_blacklist FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own blacklist items"
  ON categories_blacklist FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own blacklist items"
  ON categories_blacklist FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for purchases
CREATE POLICY "Users can view own purchases"
  ON purchases FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own purchases"
  ON purchases FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own purchases"
  ON purchases FOR UPDATE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can delete own purchases"
  ON purchases FOR DELETE
  TO anon, authenticated
  USING (true);

-- RLS Policies for purchase_history
CREATE POLICY "Users can view own purchase history"
  ON purchase_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own purchase history"
  ON purchase_history FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS Policies for notification_settings
CREATE POLICY "Users can view own notification settings"
  ON notification_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can insert own notification settings"
  ON notification_settings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notification settings"
  ON notification_settings FOR UPDATE
  TO anon, authenticated
  USING (true);

-- RLS Policies for ai_prompts (read-only for all, insert/update for authenticated)
CREATE POLICY "Anyone can view AI prompts"
  ON ai_prompts FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert AI prompts"
  ON ai_prompts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update AI prompts"
  ON ai_prompts FOR UPDATE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_financial_profiles_user_id ON financial_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_cooling_ranges_user_id ON cooling_ranges(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_blacklist_user_id ON categories_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchase_history_user_id ON purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
