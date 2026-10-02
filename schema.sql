-- =============================================================================
-- MedicineBank — Production Supabase Schema & Clinical Flashcards Workstation
-- Architecture: Clinical Curriculum & Spaced Repetition Workstation
-- =============================================================================

-- 1. Custom Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'year_of_view') THEN
    CREATE TYPE public.year_of_view AS ENUM (
      'first year',
      'second year',
      'third year',
      'fourth year',
      'fifth year',
      'internship'
    );
  END IF;
END $$;

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  email text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Lectures (Subjects / Curriculum Modules) Table
CREATE TABLE IF NOT EXISTS public.lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#7aaee8',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by_name text,
  year_of_view public.year_of_view NOT NULL DEFAULT 'first year',
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Materials Table (PDFs, Anki .apkg Flashcards, Audio, Videos)
CREATE TABLE IF NOT EXISTS public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type = ANY (ARRAY['pdf'::text, 'q'::text, 'flashcards'::text, 'spotify'::text, 'youtube'::text, 'link'::text])),
  kind text NOT NULL CHECK (kind = ANY (ARRAY['link'::text, 'upload'::text])),
  title text NOT NULL,
  url text NOT NULL,
  file_name text,
  caption text,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  uploaded_by_name text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Optional FSRS Review Progress Tracking Table
CREATE TABLE IF NOT EXISTS public.flashcard_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id uuid REFERENCES public.materials(id) ON DELETE CASCADE,
  card_id text NOT NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 4),
  stability double precision NOT NULL DEFAULT 0,
  difficulty double precision NOT NULL DEFAULT 0,
  review_duration_ms integer DEFAULT 0,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamp with time zone DEFAULT now()
);

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_lectures_date ON public.lectures(date);
CREATE INDEX IF NOT EXISTS idx_lectures_year ON public.lectures(year_of_view);
CREATE INDEX IF NOT EXISTS idx_materials_lecture_id ON public.materials(lecture_id);
CREATE INDEX IF NOT EXISTS idx_materials_type ON public.materials(type);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_mat ON public.flashcard_reviews(material_id);

-- 7. Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.flashcard_reviews ENABLE ROW LEVEL SECURITY;

-- Public Read Policies
DROP POLICY IF EXISTS "Public lectures read" ON public.lectures;
CREATE POLICY "Public lectures read" ON public.lectures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public materials read" ON public.materials;
CREATE POLICY "Public materials read" ON public.materials FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public reviews read" ON public.flashcard_reviews;
CREATE POLICY "Public reviews read" ON public.flashcard_reviews FOR SELECT USING (true);

-- Anonymous / Authenticated Upload & Insert Policies
DROP POLICY IF EXISTS "Public materials insert" ON public.materials;
CREATE POLICY "Public materials insert" ON public.materials FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public lectures insert" ON public.lectures;
CREATE POLICY "Public lectures insert" ON public.lectures FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public reviews insert" ON public.flashcard_reviews;
CREATE POLICY "Public reviews insert" ON public.flashcard_reviews FOR INSERT WITH CHECK (true);

-- Management (Update & Delete) Policies for Admin Dashboard
DROP POLICY IF EXISTS "Public materials update" ON public.materials;
CREATE POLICY "Public materials update" ON public.materials FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public materials delete" ON public.materials;
CREATE POLICY "Public materials delete" ON public.materials FOR DELETE USING (true);

DROP POLICY IF EXISTS "Public lectures update" ON public.lectures;
CREATE POLICY "Public lectures update" ON public.lectures FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public lectures delete" ON public.lectures;
CREATE POLICY "Public lectures delete" ON public.lectures FOR DELETE USING (true);

-- 8. Safe Constraint Update (For existing Supabase instances)
DO $$ BEGIN
  ALTER TABLE public.materials DROP CONSTRAINT IF EXISTS materials_type_check;
  ALTER TABLE public.materials ADD CONSTRAINT materials_type_check 
    CHECK (type = ANY (ARRAY['pdf'::text, 'q'::text, 'flashcards'::text, 'spotify'::text, 'youtube'::text, 'link'::text]));
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Storage bucket initialization instruction:
-- Ensure bucket 'materials' exists in Supabase Storage with public read access enabled.