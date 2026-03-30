-- ScholarGrid Row Level Security Policies
-- Run this in Supabase SQL Editor AFTER 001_initial_schema.sql

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints         ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_interactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- PROFILES
-- ============================================================
CREATE POLICY "Anyone can view profiles"   ON profiles FOR SELECT USING (true);
CREATE POLICY "User updates own profile"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- ============================================================
-- NOTES
-- ============================================================
CREATE POLICY "Notes select" ON notes FOR SELECT USING (
  status = 'approved'
  OR uploaded_by = auth.uid()
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Students upload notes" ON notes FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Admins moderate notes" ON notes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- CHAT GROUPS
-- ============================================================
CREATE POLICY "Authenticated users view groups" ON chat_groups FOR SELECT
  USING (auth.role() = 'authenticated');
CREATE POLICY "Admins insert groups" ON chat_groups FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins update groups" ON chat_groups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins delete groups" ON chat_groups FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
CREATE POLICY "Members view memberships" ON group_members FOR SELECT
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins add members" ON group_members FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins remove members" ON group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- MESSAGES
-- ============================================================
CREATE POLICY "Group members read messages" ON messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = messages.group_id AND user_id = auth.uid()
  ));
CREATE POLICY "Group members send messages" ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM group_members
      WHERE group_id = messages.group_id AND user_id = auth.uid()
    )
  );

-- ============================================================
-- COMPLAINTS
-- ============================================================
CREATE POLICY "Own or admin complaints" ON complaints FOR SELECT
  USING (submitted_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Users submit complaints" ON complaints FOR INSERT
  WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Admins respond to complaints" ON complaints FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- NOTE INTERACTIONS
-- ============================================================
CREATE POLICY "Users log own interactions" ON note_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users see own interactions" ON note_interactions FOR SELECT
  USING (user_id = auth.uid());

-- ============================================================
-- ANALYTICS EVENTS
-- ============================================================
CREATE POLICY "Users log own events" ON analytics_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read all events" ON analytics_events FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
