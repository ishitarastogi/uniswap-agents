const PROPOSAL_CREATED = `event ProposalCreated(uint id, address proposer, address[] targets, uint[] values, string[] signatures, bytes[] calldatas, uint startBlock, uint endBlock, string description)`;
const GET_PRIOR_VOTES = [
  "function getPriorVotes(address account, uint blockNumber) public view returns (uint96)",
];
const PROPOSAL_THRESHOLD = ["function proposalThreshold() view returns (uint)"];
const PROPOSAL_CANCELED = `event ProposalCanceled(uint id)`;
const PROPOSAL_QUEUED = `event ProposalQueued(uint id, uint eta)`;
export default {
  PROPOSAL_CREATED,
  GET_PRIOR_VOTES,
  PROPOSAL_THRESHOLD,
  PROPOSAL_CANCELED,
  PROPOSAL_QUEUED,
};
