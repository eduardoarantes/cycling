/**
 * Glossary Tooltips
 *
 * Automatically adds tooltips to glossary terms throughout reports.
 * Single source of truth: glossary-terms.json
 */

(function() {
    'use strict';

    let glossaryTerms = null;

    /**
     * Load glossary terms from JSON file
     */
    async function loadGlossaryTerms() {
        try {
            const response = await fetch('glossary-terms.json');
            const data = await response.json();
            glossaryTerms = data.terms;
            return glossaryTerms;
        } catch (error) {
            console.error('Failed to load glossary terms:', error);
            return null;
        }
    }

    /**
     * Create tooltip element for a term
     */
    function createTooltip(termKey, termData) {
        const tooltip = document.createElement('span');
        tooltip.className = 'glossary-tooltip';
        tooltip.setAttribute('data-term', termKey);

        const trigger = document.createElement('span');
        trigger.className = 'glossary-term';
        trigger.textContent = termKey;

        const icon = document.createElement('span');
        icon.className = 'glossary-icon';
        icon.innerHTML = '?';

        const popup = document.createElement('span');
        popup.className = 'glossary-popup';

        const title = document.createElement('strong');
        title.textContent = termData.full_name;

        const definition = document.createElement('p');
        definition.textContent = termData.short_definition;

        const link = document.createElement('a');
        link.href = 'glossary.html';
        link.textContent = 'See full glossary →';
        link.className = 'glossary-link';

        popup.appendChild(title);
        popup.appendChild(definition);
        popup.appendChild(link);

        tooltip.appendChild(trigger);
        tooltip.appendChild(icon);
        tooltip.appendChild(popup);

        return tooltip;
    }

    /**
     * Escape special regex characters
     */
    function escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Add tooltips to matching terms in text nodes
     */
    function addTooltipsToElement(element, terms) {
        // Skip if already processed
        if (element.hasAttribute('data-glossary-processed')) {
            return;
        }

        // Skip certain elements
        const skipTags = ['SCRIPT', 'STYLE', 'CODE', 'PRE', 'A', 'GLOSSARY-TOOLTIP'];
        if (skipTags.includes(element.tagName)) {
            return;
        }

        // Process text nodes
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: function(node) {
                    // Skip if parent is a skip tag
                    if (skipTags.includes(node.parentNode.tagName)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    // Only accept text nodes with actual content
                    if (node.textContent.trim().length > 0) {
                        return NodeFilter.FILTER_ACCEPT;
                    }
                    return NodeFilter.FILTER_REJECT;
                }
            }
        );

        const nodesToProcess = [];
        let node;
        while (node = walker.nextNode()) {
            nodesToProcess.push(node);
        }

        // Build regex pattern for all terms (sorted by length, longest first)
        const termKeys = Object.keys(terms).sort((a, b) => b.length - a.length);
        const pattern = new RegExp('\\b(' + termKeys.map(escapeRegex).join('|') + ')\\b', 'g');

        // Process each text node
        nodesToProcess.forEach(textNode => {
            const text = textNode.textContent;
            const matches = [...text.matchAll(pattern)];

            if (matches.length === 0) {
                return;
            }

            const parent = textNode.parentNode;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            matches.forEach(match => {
                const termKey = match[0];
                const termData = terms[termKey];
                const startIndex = match.index;

                // Add text before match
                if (startIndex > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(text.substring(lastIndex, startIndex))
                    );
                }

                // Add tooltip
                fragment.appendChild(createTooltip(termKey, termData));

                lastIndex = startIndex + termKey.length;
            });

            // Add remaining text
            if (lastIndex < text.length) {
                fragment.appendChild(
                    document.createTextNode(text.substring(lastIndex))
                );
            }

            parent.replaceChild(fragment, textNode);
        });

        element.setAttribute('data-glossary-processed', 'true');
    }

    /**
     * Initialize tooltips for specific sections
     */
    function initializeTooltips(selectors = ['.section', '.findings', '.action-plan']) {
        if (!glossaryTerms) {
            console.warn('Glossary terms not loaded');
            return;
        }

        selectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                addTooltipsToElement(element, glossaryTerms);
            });
        });

        // Add event listeners for tooltip interactions
        setupTooltipInteractions();
    }

    /**
     * Setup tooltip hover/click interactions
     */
    function setupTooltipInteractions() {
        document.addEventListener('click', function(e) {
            // Close all tooltips when clicking outside
            if (!e.target.closest('.glossary-tooltip')) {
                document.querySelectorAll('.glossary-popup.active').forEach(popup => {
                    popup.classList.remove('active');
                });
            }
        });

        // Delegate event handling to document
        document.addEventListener('click', function(e) {
            const glossaryIcon = e.target.closest('.glossary-icon');
            if (glossaryIcon) {
                e.stopPropagation();
                const tooltip = glossaryIcon.closest('.glossary-tooltip');
                const popup = tooltip.querySelector('.glossary-popup');

                // Close other popups
                document.querySelectorAll('.glossary-popup.active').forEach(p => {
                    if (p !== popup) {
                        p.classList.remove('active');
                    }
                });

                // Toggle this popup
                popup.classList.toggle('active');
            }
        });

        // Also support hover on desktop
        document.addEventListener('mouseenter', function(e) {
            const glossaryIcon = e.target.closest('.glossary-icon');
            if (glossaryIcon && window.innerWidth > 768) {
                const tooltip = glossaryIcon.closest('.glossary-tooltip');
                const popup = tooltip.querySelector('.glossary-popup');
                popup.classList.add('hover');
            }
        }, true);

        document.addEventListener('mouseleave', function(e) {
            const glossaryIcon = e.target.closest('.glossary-icon');
            if (glossaryIcon && window.innerWidth > 768) {
                const tooltip = glossaryIcon.closest('.glossary-tooltip');
                const popup = tooltip.querySelector('.glossary-popup');
                popup.classList.remove('hover');
            }
        }, true);
    }

    /**
     * Main initialization
     */
    async function init(options = {}) {
        const selectors = options.selectors || ['.section', '.findings', '.action-plan', '.recovery-box', '.checklist'];

        await loadGlossaryTerms();

        if (glossaryTerms) {
            // Initialize tooltips when DOM is ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    initializeTooltips(selectors);
                });
            } else {
                initializeTooltips(selectors);
            }
        }
    }

    // Export to global scope
    window.GlossaryTooltips = {
        init: init,
        loadTerms: loadGlossaryTerms,
        addTooltips: initializeTooltips
    };

    // Auto-initialize by default
    init();
})();
