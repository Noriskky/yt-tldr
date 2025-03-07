export function formatMarkdown(markdown: string): string {
    let formatted = markdown;

    // Fix lists formatting
    formatted = formatted.replace(/^(\s*[-*+])(?!\s)/gm, '$1 ');

    // Fix numbered lists formatting
    formatted = formatted.replace(/^(\s*\d+\.)(?!\s)/gm, '$1 ');

    // Add blank line before lists
    formatted = formatted.replace(/([^\n])\n(\s*[-*+])/g, '$1\n\n$2');
    formatted = formatted.replace(/([^\n])\n(\s*\d+\.)/g, '$1\n\n$2');

    // Add Better timestamp formatting
    formatted = formatted.replace(/\b(\d{1,2}):(\d{2})\b/g, function(match, minutes, seconds) {
        const formattedMinutes = minutes.length === 1 ? `0${minutes}` : minutes;
        return `${formattedMinutes}:${seconds}`;
    });

    return formatted;
}