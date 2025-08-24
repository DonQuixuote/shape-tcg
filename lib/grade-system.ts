export function getGradeByRank(rank: number | null): string {
  if (!rank) return "Ungraded"

  if (rank <= 10) return "S-Rank"
  if (rank <= 25) return "A-Rank"
  if (rank <= 50) return "B-Rank"
  if (rank <= 100) return "C-Rank"
  if (rank <= 250) return "D-Rank"

  return "Ungraded"
}
