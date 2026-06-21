import datetime
from typing import Dict, Any, List

def analyze_sentiment_and_tone(abstract: str) -> str:
    """
    Analyzes project abstract to determine the optimal tone for high engagement.
    - Inspiring/Empathetic: for health, inclusion, environment, or social impact.
    - Highly Technical/Crisp: for infrastructure, databases, compiler design.
    - Innovative/Energetic: for general applications, web portals, or hackathon utilities.
    """
    text = abstract.lower()
    inspiring_keywords = ["health", "care", "social", "help", "diversity", "environment", "green", "earth", "medical", "patient", "women"]
    technical_keywords = ["database", "compiler", "kubernetes", "docker", "optimized", "decentralized", "blockchain", "latency", "vector", "pipeline"]
    
    inspire_score = sum(1 for word in inspiring_keywords if word in text)
    tech_score = sum(1 for word in technical_keywords if word in text)
    
    if inspire_score > tech_score:
        return "INSPIRATIONAL"
    elif tech_score > inspire_score:
        return "TECHNICAL"
    else:
        return "INNOVATIVE"

def predict_optimal_send_time(submission_time: datetime.datetime) -> Dict[str, Any]:
    """
    Predictive timing optimization based on submission behavior.
    - Late-night submissions (10 PM - 6 AM) are scheduled for 9:30 AM local time.
    - Business hours submissions are sent with a 15-minute verification buffer.
    - Evening submissions (6 PM - 10 PM) are scheduled for immediately or next morning at 9:00 AM.
    """
    hour = submission_time.hour
    
    if 22 <= hour or hour < 6:
        # Late night: Shift to next morning at 9:30 AM to maximize open rate (>70% goal)
        scheduled_time = submission_time.replace(hour=9, minute=30, second=0, microsecond=0)
        if hour >= 22:
            scheduled_time += datetime.timedelta(days=1)
        reason = "Scheduled for 9:30 AM to avoid night-time silent spam filters."
    elif 18 <= hour < 22:
        # Evening: Shift to next morning at 9:00 AM
        scheduled_time = submission_time.replace(hour=9, minute=0, second=0, microsecond=0) + datetime.timedelta(days=1)
        reason = "Scheduled for next business day morning to ensure high engagement."
    else:
        # Daytime: Send immediately (15-min validation window)
        scheduled_time = submission_time + datetime.timedelta(minutes=15)
        reason = "Optimal daytime slot; sent with a 15-min post-registration window."
        
    return {
        "scheduled_time": scheduled_time.isoformat(),
        "reason": reason
    }

def get_multilingual_template(
    tone: str, 
    team_id: int, 
    title: str, 
    skills: List[str], 
    success_score: float,
    lang: str = "en"
) -> str:
    """
    Generates personalized content localized to the participant's regional language.
    Supports English (en), Spanish (es), and Hindi (hi) translations.
    """
    skills_str = ", ".join(skills).upper()
    score_pct = f"{success_score * 100:.1f}%"
    
    templates = {
        "en": {
            "TECHNICAL": (
                f"Dear Team {team_id},\n\n"
                f"Your project abstract for '{title}' has been successfully parsed and verified.\n"
                f"Our NLP agent extracted technical skill tags: {skills_str}.\n"
                f"Initial predictive success rate: {score_pct}. Routing to technical evaluations pipeline.\n\n"
                f"Best regards,\nDell Agentic OS Team"
            ),
            "INSPIRATIONAL": (
                f"Dear Team {team_id},\n\n"
                f"Thank you for building '{title}' to make a difference!\n"
                f"Your social-impact skills ({skills_str}) are highly valued.\n"
                f"Initial team completeness rating: {score_pct}. We look forward to your demo!\n\n"
                f"Warmly,\nDell Future Minds Team"
            ),
            "INNOVATIVE": (
                f"Dear Team {team_id},\n\n"
                f"Welcome to Dell Future Minds 2026! Project '{title}' registration confirmed.\n"
                f"Core domains parsed: {skills_str}.\n"
                f"Predictive project health score: {score_pct}. Let's build the future!\n\n"
                f"Cheers,\nDell Hackathon organizers"
            )
        },
        "es": {
            "TECHNICAL": (
                f"Estimado Equipo {team_id},\n\n"
                f"Su propuesta para '{title}' ha sido analizada y verificada con éxito.\n"
                f"Habilidades técnicas extraídas: {skills_str}.\n"
                f"Tasa de éxito predictivo: {score_pct}. Enrutando a evaluación técnica.\n\n"
                f"Saludos cordiales,\nEquipo de Dell Agentic OS"
            ),
            "INSPIRATIONAL": (
                f"Estimado Equipo {team_id},\n\n"
                f"¡Gracias por construir '{title}' para marcar la diferencia!\n"
                f"Habilidades de impacto social ({skills_str}) son altamente valoradas.\n"
                f"Compleción inicial del equipo: {score_pct}. ¡Esperamos su demostración!\n\n"
                f"Con cariño,\nEquipo de Dell Future Minds"
            ),
            "INNOVATIVE": (
                f"Estimado Equipo {team_id},\n\n"
                f"¡Bienvenido a Dell Future Minds 2026! Registro confirmado para '{title}'.\n"
                f"Dominios principales extraídos: {skills_str}.\n"
                f"Puntaje predictivo de salud: {score_pct}. ¡Vamos a crear el futuro!\n\n"
                f"Saludos,\nOrganizadores de Dell"
            )
        },
        "hi": {
            "TECHNICAL": (
                f"प्रिय टीम {team_id},\n\n"
                f"'{title}' के लिए आपका प्रोजेक्ट विवरण सफलतापूर्वक सत्यापित कर लिया गया है।\n"
                f"तकनीकी कौशल टैग: {skills_str}।\n"
                f"प्रारंभिक सफलता दर: {score_pct}। तकनीकी मूल्यांकन प्रक्रिया शुरू की जा रही है।\n\n"
                f"सादर,\nडेल एजेंटिक ओएस टीम"
            ),
            "INSPIRATIONAL": (
                f"प्रिय टीम {team_id},\n\n"
                f"समाज में बदलाव लाने के लिए '{title}' बनाने हेतु आपका धन्यवाद!\n"
                f"आपके कौशल ({skills_str}) हमारे लिए अत्यंत मूल्यवान हैं।\n"
                f"प्रारंभिक टीम स्कोर: {score_pct}। हम आपके प्रदर्शन की प्रतीक्षा कर रहे हैं!\n\n"
                f"शुभकामनाएं,\nडेल फ्यूचर माइंड्स टीम"
            ),
            "INNOVATIVE": (
                f"प्रिय टीम {team_id},\n\n"
                f"डेल फ्यूचर माइंड्स 2026 में आपका स्वागत है! '{title}' का पंजीकरण सफल रहा।\n"
                f"मुख्य डोमेन: {skills_str}।\n"
                f"प्रारंभिक प्रोजेक्ट स्वास्थ्य स्कोर: {score_pct}। आइए भविष्य का निर्माण करें!\n\n"
                f"धन्यवाद,\nडेल हैकाथॉन आयोजक"
            )
        }
    }
    
    lang_set = templates.get(lang, templates["en"])
    return lang_set.get(tone, lang_set["INNOVATIVE"])
