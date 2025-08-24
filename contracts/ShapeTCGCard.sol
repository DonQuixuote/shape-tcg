// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// OpenZeppelin imports (make sure your project has the OZ contracts)
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

contract ShapeTCGCard is ERC721, Ownable {
    using Strings for uint256;

    uint256 public nextTokenId;

    struct CardData {
        string name;
        string grade;
        uint256 power;
        uint256 health;
        uint256 defense;
        string skill;
        bool isHolographic;
        string originalImage;
    }

    mapping(uint256 => CardData) public cardData;

    constructor() ERC721("ShapeTCG Card", "STCG") {}

    function mintCard(
        string memory name,
        string memory grade,
        uint256 power,
        uint256 health,
        uint256 defense,
        string memory skill,
        bool isHolographic,
        string memory originalImage
    ) external {
        uint256 tokenId = nextTokenId;
        nextTokenId++;
        
        // Store card data
        cardData[tokenId] = CardData({
            name: name,
            grade: grade,
            power: power,
            health: health,
            defense: defense,
            skill: skill,
            isHolographic: isHolographic,
            originalImage: originalImage
        });
        
        _safeMint(msg.sender, tokenId);
    }

    /// @notice Build tokenURI JSON on-chain (data:application/json;base64,...)
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "Nonexistent token");

        CardData memory card = cardData[tokenId];
        string memory name = string(abi.encodePacked("ShapeTCG #", tokenId.toString(), " - ", card.name));
        string memory description = "ShapeTCG trading card minted on Shape Network with on-chain SVG generation.";
        string memory image = generateCardSVG(tokenId);

        bytes memory metadata = abi.encodePacked(
            '{',
                '"name":"', name, '",',
                '"description":"', description, '",',
                '"image":"', image, '",',
                '"attributes": [',
                    '{"trait_type":"Grade","value":"', card.grade, '"},',
                    '{"trait_type":"Power","value":', card.power.toString(), '},',
                    '{"trait_type":"Health","value":', card.health.toString(), '},',
                    '{"trait_type":"Defense","value":', card.defense.toString(), '},',
                    '{"trait_type":"Holographic","value":"', card.isHolographic ? 'true' : 'false', '"},',
                    '{"trait_type":"Skill","value":"', card.skill, '"}',
                ']',
            '}'
        );

        string memory encoded = Base64.encode(metadata);
        return string(abi.encodePacked("data:application/json;base64,", encoded));
    }

    function generateCardSVG(uint256 tokenId) internal view returns (string memory) {
        CardData memory card = cardData[tokenId];
        
        // Generate colors based on grade
        string memory gradeColor = _getGradeColor(card.grade);
        string memory bgColor = card.isHolographic ? "url(#holographic)" : "#1a1a1a";
        
        // Build holographic gradient if needed
        string memory holographicDef = card.isHolographic ? 
            '<defs><linearGradient id="holographic" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:#ff00ff;stop-opacity:0.8" /><stop offset="25%" style="stop-color:#00ffff;stop-opacity:0.8" /><stop offset="50%" style="stop-color:#ffff00;stop-opacity:0.8" /><stop offset="75%" style="stop-color:#ff00ff;stop-opacity:0.8" /><stop offset="100%" style="stop-color:#00ffff;stop-opacity:0.8" /></linearGradient></defs>' : '';

        string memory svg = string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">',
            holographicDef,
            // Card background
            '<rect width="300" height="420" rx="15" fill="', bgColor, '" stroke="', gradeColor, '" stroke-width="3"/>',
            // Header section
            '<rect x="10" y="10" width="280" height="40" rx="8" fill="', gradeColor, '" opacity="0.2"/>',
            '<text x="20" y="35" font-family="Arial Black" font-size="16" fill="', gradeColor, '">', card.name, '</text>',
            // Grade badge
            '<rect x="220" y="15" width="70" height="30" rx="15" fill="', gradeColor, '"/>',
            '<text x="255" y="35" font-family="Arial" font-size="12" fill="white" text-anchor="middle">', card.grade, '</text>',
            // Image placeholder (since we can\'t embed external images in SVG)
            '<rect x="20" y="60" width="260" height="180" rx="10" fill="#333" stroke="#666" stroke-width="2"/>',
            '<text x="150" y="155" font-family="Arial" font-size="14" fill="#999" text-anchor="middle">NFT Image</text>',
            // Stats section
            '<rect x="10" y="250" width="280" height="80" rx="8" fill="#222" stroke="#444" stroke-width="1"/>',
            '<text x="20" y="275" font-family="Arial" font-size="14" fill="#fff">ATK: ', card.power.toString(), '</text>',
            '<text x="120" y="275" font-family="Arial" font-size="14" fill="#fff">DEF: ', card.defense.toString(), '</text>',
            '<text x="220" y="275" font-family="Arial" font-size="14" fill="#fff">HP: ', card.health.toString(), '</text>'
        ));

        // Add skill text (truncated for space)
        string memory skillText = _truncateString(card.skill, 40);
        svg = string(abi.encodePacked(
            svg,
            '<text x="20" y="300" font-family="Arial" font-size="10" fill="#ccc">Skill: ', skillText, '</text>',
            // Holographic indicator
            card.isHolographic ? '<text x="20" y="320" font-family="Arial" font-size="10" fill="#ff00ff">✨ HOLOGRAPHIC</text>' : '',
            // Token ID
            '<text x="150" y="405" font-family="Arial" font-size="8" fill="#666" text-anchor="middle">#', tokenId.toString(), '</text>',
            '</svg>'
        ));

        // base64 encode SVG
        string memory svgBase64 = Base64.encode(bytes(svg));
        return string(abi.encodePacked("data:image/svg+xml;base64,", svgBase64));
    }

    function _getGradeColor(string memory grade) internal pure returns (string memory) {
        bytes32 gradeHash = keccak256(abi.encodePacked(grade));
        
        if (gradeHash == keccak256(abi.encodePacked("S-Rank"))) return "#ef4444"; // red
        if (gradeHash == keccak256(abi.encodePacked("A-Rank"))) return "#f97316"; // orange
        if (gradeHash == keccak256(abi.encodePacked("B-Rank"))) return "#eab308"; // yellow
        if (gradeHash == keccak256(abi.encodePacked("C-Rank"))) return "#22c55e"; // green
        if (gradeHash == keccak256(abi.encodePacked("D-Rank"))) return "#3b82f6"; // blue
        return "#6b7280"; // gray for ungraded
    }

    function _truncateString(string memory str, uint256 maxLength) internal pure returns (string memory) {
        bytes memory strBytes = bytes(str);
        if (strBytes.length <= maxLength) {
            return str;
        }
        
        bytes memory truncated = new bytes(maxLength);
        for (uint256 i = 0; i < maxLength; i++) {
            truncated[i] = strBytes[i];
        }
        return string(truncated);
    }

    // Owner functions (optional convenience)
    function setBaseNext(uint256 _next) external onlyOwner {
        nextTokenId = _next;
    }
}
