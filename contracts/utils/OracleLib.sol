// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

// Changed from library to contract
contract OracleLib {
    /**
     * @notice Calculates the median of an array of int256 values
     * @param values Array of int256 values
     * @return median The median value
     */
    function getMedian(int256[] memory values) public pure returns (int256) {
        require(values.length > 0, "Empty array");

        // Sort the array
        for (uint256 i = 0; i < values.length; i++) {
            for (uint256 j = i + 1; j < values.length; j++) {
                if (values[i] > values[j]) {
                    int256 temp = values[i];
                    values[i] = values[j];
                    values[j] = temp;
                }
            }
        }

        // Find median
        if (values.length % 2 == 0) {
            // Even number of elements
            uint256 midIndex = values.length / 2;
            return (values[midIndex - 1] + values[midIndex]) / 2;
        } else {
            // Odd number of elements
            return values[values.length / 2];
        }
    }
}