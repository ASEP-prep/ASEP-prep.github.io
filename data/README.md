# Αρχεία δεδομένων

Η εφαρμογή διαβάζει μόνο αυτά τα αρχεία. Διορθώσεις εδώ δεν χρειάζονται αλλαγή κώδικα.

## bank.json
Η δομημένη τράπεζα (ίδια με το `asep_bank.json` του project): `meta` (με `version`) και `questions`.
Κάθε ερώτηση: `id` (π.χ. `2-14`), `subject_no`, `subject`, `file`, `number`, `page`, `question`,
`options` (`α`–`δ`), `answer` (επίσημη απάντηση ΑΣΕΠ), `answer_source`, `notes`.
Αν αλλάξει το κείμενο ή η απάντηση μιας ερώτησης, η παλιά πρόοδος για αυτή την ερώτηση παύει να μετράει.

## exam-config.json
Κανόνες προσομοίωσης. Πεδία στο `knowledge`: `questions`, `time_minutes`, `allow_back`,
`penalty_fraction` (κλάσμα της αξίας μιας σωστής που αφαιρείται ανά λάθος, 0 = χωρίς),
`base_score` (`null` = χωρίς βάση), `max_score`, `weight_percent` (πληροφοριακό),
`selection` (`random_all` ή `equal_subjects`), `subject_quota` (`null` ή π.χ. `{"1": 3, "2": 4, …}`),
`shuffle_options`. Όταν αλλάζουν οι κανόνες, άλλαξε και το `version`, ώστε η εφαρμογή να ειδοποιήσει
όσους έχουν δικές τους ρυθμίσεις.

## sections.json
Τα μέρη της εξέτασης στην αρχική οθόνη. `status`: `active`, `planned` ή `waiting`.

## explanations/
`index.json` → `{ "files": [ { "file": "2.json", "subject_no": 2, "version": "…" } ] }`.
Κάθε αρχείο ενότητας:
```json
{
  "meta": { "subject_no": 2, "version": "2026-11-xx_v1", "note": "Όχι επίσημο υλικό ΑΣΕΠ" },
  "items": {
    "2-14": { "tag": "ΓΝΩΣΗ", "text": "…", "basis": "άρθρο … ν. …" }
  }
}
```
`tag`: `ΓΝΩΣΗ` ή `ΑΒΕΒΑΙΟ`. Η επίσημη απάντηση έρχεται πάντα από το `bank.json` και δεν αλλάζει από εδώ.
