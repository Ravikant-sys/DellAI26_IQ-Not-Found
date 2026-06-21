class SpacyMock:
    def __init__(self):
        pass
    def __call__(self, text):
        return DocMock(text)

class DocMock:
    def __init__(self, text):
        self.text = text
        self.ents = self._extract_entities(text)
        
    def _extract_entities(self, text):
        skills_dict = ["react", "next.js", "spring boot", "fastapi", "postgresql", "postgres", "dbscan", "hungarian", "scipy", "scikit-learn", "tensorflow", "pytorch", "rust", "go", "docker", "kubernetes", "aws", "python", "java", "javascript", "tailwind", "solidity", "wasm", "zkp", "html", "css", "vue", "angular", "node"]
        ents = []
        lower_text = text.lower()
        for skill in skills_dict:
            start = 0
            while True:
                idx = lower_text.find(skill, start)
                if idx == -1:
                    break
                ents.append(EntMock(skill.upper(), "SKILL"))
                start = idx + len(skill)
        return list(set(ents)) # unique

class EntMock:
    def __init__(self, text, label):
        self.text = text
        self.label_ = label
    def __eq__(self, other):
        return self.text == other.text and self.label_ == other.label_
    def __hash__(self):
        return hash((self.text, self.label_))

def load(model_name):
    return SpacyMock()
