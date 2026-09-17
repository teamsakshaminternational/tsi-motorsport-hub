# Motorsport Noir public-site redesign

## Scope
- Preserve the existing routes, data loading, admin page, database, authentication, uploads, keepalive route, and deployment configuration.
- Apply the selected Motorsport Noir direction only to the public site, using the existing TSI logo, Anton, Barlow, near-black surfaces, and TSI orange as the sole accent.

## Home
- Keep the existing hero image fallback chain and rebuild the hero as full-bleed photography with a strong left-to-right dark overlay, slow reduced-motion-safe Ken Burns movement, visible TSI identity, and VIT Chennai reference.
- Replace the current stats with animated generation, alumni, achievement, and “Since 2012” figures.
- Add a touch/drag-scrollable generation strip linking to each gallery section.
- Add the requested `site/band1.webp` quote band, latest achievements, sponsor marquee on white logo tiles, and `site/team_photo.webp` crew call-to-action.

## Public pages
- Gallery: cover-led generation sections, sticky generation jump navigation, masonry-style photo grids, hover zoom, and lightbox swipe plus existing keyboard navigation.
- Team and Alumni: compact circular portraits, initials fallbacks, restrained orange hover rings, count badges, and mobile-safe grids; alumni remain intentionally simple and newest-first.
- Achievements: year-based vertical timeline with prominent result text and supporting placements represented as compact chips when present in the loaded records.
- Sponsors: tier-grouped white logo tiles and existing partnership content.
- About: two-column story layout with `site/band2.webp` and the supplied fallback copy.
- Blog and shared navigation/footer: visually align them with the same editorial motorsport system without changing their content behavior.

## Quality and accessibility
- Add lazy loading, async decoding, and stable aspect ratios to public content images.
- Keep motion subtle and disable decorative movement when reduced motion is requested.
- Ensure navigation, strips, cards, labels, and images fit cleanly at 375px.
- Add complete per-page social metadata where missing.
- Validate public routes at desktop and 375px, including generation links, horizontal scrolling, lightbox keyboard/swipe behavior, and image loading.
