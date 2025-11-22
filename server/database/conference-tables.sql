-- Fee Payments Table
CREATE TABLE IF NOT EXISTS fee_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    paper_number TEXT,
    name TEXT NOT NULL,
    gender TEXT,
    email TEXT NOT NULL,
    participant_category TEXT,
    iwa_member_info TEXT,
    country TEXT,
    institution TEXT,
    state_province TEXT,
    city TEXT,
    address TEXT,
    zip_code TEXT,
    affiliation TEXT,
    work_phone TEXT,
    mobile_phone TEXT,
    remarks TEXT,
    payment_status TEXT DEFAULT 'NotPaid',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Abstract Submissions Table
CREATE TABLE IF NOT EXISTS abstract_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    authors TEXT NOT NULL,
    affiliation TEXT NOT NULL,
    topic INTEGER NOT NULL,
    presentation_type TEXT,
    abstract TEXT NOT NULL,
    keywords TEXT NOT NULL,
    file_path TEXT,
    original_filename TEXT,
    status TEXT DEFAULT 'Pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fee_payments_user_id ON fee_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_abstract_submissions_user_id ON abstract_submissions(user_id);
