-- ScholarGrid Initial Schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name   TEXT,
  avatar_url  TEXT,
  role        TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  points      INT  DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS notes (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  uploaded_by  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  file_url     TEXT,
  subject      TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHAT GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_groups (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  group_id   UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id)    ON DELETE CASCADE,
  joined_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id   UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
  sender_id  UUID REFERENCES profiles(id)    ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- COMPLAINTS
-- ============================================================
CREATE TABLE IF NOT EXISTS complaints (
  id             UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  submitted_by   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'closed')),
  admin_response TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTE INTERACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS note_interactions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  note_id    UUID REFERENCES notes(id)    ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT CHECK (type IN ('like', 'download')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (note_id, user_id, type)
);

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID REFERENCES profiles(id),
  event_type  TEXT NOT NULL,
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LEADERBOARD VIEW
-- ============================================================
CREATE OR REPLACE VIEW leaderboard AS
  SELECT
    id            AS user_id,
    full_name,
    avatar_url,
    points,
    RANK() OVER (ORDER BY points DESC) AS rank
  FROM profiles
  WHERE role = 'student'
  ORDER BY points DESC;

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ============================================================
-- POINTS AWARD TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION award_points()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'note_interactions' THEN
    UPDATE profiles SET points = points + 5
    WHERE id = (SELECT uploaded_by FROM notes WHERE id = NEW.note_id);
  END IF;
  IF TG_TABLE_NAME = 'notes' AND NEW.status = 'approved' THEN
    UPDATE profiles SET points = points + 20 WHERE id = NEW.uploaded_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_note_interaction ON note_interactions;
CREATE TRIGGER on_note_interaction
  AFTER INSERT ON note_interactions
  FOR EACH ROW EXECUTE PROCEDURE award_points();

DROP TRIGGER IF EXISTS on_note_approved ON notes;
CREATE TRIGGER on_note_approved
  AFTER UPDATE ON notes
  FOR EACH ROW WHEN (NEW.status = 'approved' AND OLD.status != 'approved')
  EXECUTE PROCEDURE award_points();
