from sqlmodel import Session, select
from app.database import engine
from app.models import ProjectSubmission

with Session(engine) as session:
    subs = session.exec(select(ProjectSubmission)).all()
    print(f"Total Submissions: {len(subs)}")
    for s in subs:
        print(f"ID: {s.id} | Title: {s.title} | State: {s.state} | Skills: {s.extracted_skills} | Score: {s.predictive_success_score} | Email: {s.generated_email is not None} | Promo: {s.generated_promo is not None}")
