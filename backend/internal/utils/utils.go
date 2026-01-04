package utils

import (
	"strings"
	"unicode"
)

// ToTitleCase converts a name to proper title case
// Example: "john DOE" -> "John Doe"
func ToTitleCase(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return name
	}

	words := strings.Fields(name)
	for i, word := range words {
		if len(word) > 0 {
			runes := []rune(strings.ToLower(word))
			runes[0] = unicode.ToUpper(runes[0])
			words[i] = string(runes)
		}
	}
	return strings.Join(words, " ")
}
