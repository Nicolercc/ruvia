from __future__ import annotations

from .schemas import DraftInterviewRequest, DraftInterviewResponse


def draft_interview_invitation(request: DraftInterviewRequest) -> DraftInterviewResponse:
    recruiter = request.recruiter_name or "Recruiting Team"
    details = (
        request.interview_details.strip()
        if request.interview_details and request.interview_details.strip()
        else "Please reply with a few times that work for you, and we will confirm the interview details."
    )
    subject = f"Interview invitation for {request.job_title}"
    body = (
        f"Hi {request.candidate_name},\n\n"
        f"Thank you for your interest in the {request.job_title} role. "
        "We would like to invite you to continue the conversation with our team.\n\n"
        f"{details}\n\n"
        "This message is a recruiter-editable draft and has not been sent.\n\n"
        f"Best,\n{recruiter}"
    )
    return DraftInterviewResponse(subject=subject, body=body)
