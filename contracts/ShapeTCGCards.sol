// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ShapeTCGCards is ERC721, ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    struct CardStats {
        uint8 power;
        uint8 health;
        uint8 defense;
        string skill;
        string rarity;
        string grade;
        address originalNFTContract;
        uint256 originalTokenId;
    }

    mapping(uint256 => CardStats) public cardStats;
    mapping(address => mapping(uint256 => bool)) public usedNFTs;
    
    event CardMinted(
        uint256 indexed tokenId,
        address indexed owner,
        address originalNFTContract,
        uint256 originalTokenId,
        string rarity
    );

    constructor() ERC721("ShapeTCG Cards", "STCG") {}

    function mintCard(
        address to,
        string memory tokenURI,
        uint8 power,
        uint8 health,
        uint8 defense,
        string memory skill,
        string memory rarity,
        string memory grade,
        address originalNFTContract,
        uint256 originalTokenId
    ) public returns (uint256) {
        // Ensure the original NFT hasn't been used to mint a card already
        require(!usedNFTs[originalNFTContract][originalTokenId], "NFT already used for minting");
        
        // Verify the caller owns the original NFT (optional security check)
        // This would require importing the ERC721 interface and checking ownership
        
        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Store card stats
        cardStats[tokenId] = CardStats({
            power: power,
            health: health,
            defense: defense,
            skill: skill,
            rarity: rarity,
            grade: grade,
            originalNFTContract: originalNFTContract,
            originalTokenId: originalTokenId
        });
        
        // Mark the original NFT as used
        usedNFTs[originalNFTContract][originalTokenId] = true;
        
        emit CardMinted(tokenId, to, originalNFTContract, originalTokenId, rarity);
        
        return tokenId;
    }

    function getCardStats(uint256 tokenId) public view returns (CardStats memory) {
        require(_exists(tokenId), "Card does not exist");
        return cardStats[tokenId];
    }

    function isNFTUsed(address nftContract, uint256 tokenId) public view returns (bool) {
        return usedNFTs[nftContract][tokenId];
    }

    // Override required by Solidity
    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        // When a card is burned, free up the original NFT for reuse
        CardStats memory stats = cardStats[tokenId];
        usedNFTs[stats.originalNFTContract][stats.originalTokenId] = false;
        delete cardStats[tokenId];
        
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
