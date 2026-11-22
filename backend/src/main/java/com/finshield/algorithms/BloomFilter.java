package com.finshield.algorithms;

import java.nio.charset.StandardCharsets;
import java.util.BitSet;

public class BloomFilter {
    private final BitSet bitSet;
    private final int bitArraySize;
    private final int numHashFunctions;
    private int insertedElements = 0;

    public BloomFilter(int expectedElements, double falsePositiveRate) {
        if (expectedElements <= 0 || falsePositiveRate <= 0 || falsePositiveRate >= 1) {
            throw new IllegalArgumentException("Invalid BloomFilter parameters.");
        }
        this.bitArraySize = (int) Math.ceil(-(expectedElements * Math.log(falsePositiveRate)) / Math.pow(Math.log(2), 2));
        this.numHashFunctions = Math.max(1, (int) Math.round(((double) bitArraySize / expectedElements) * Math.log(2)));
        this.bitSet = new BitSet(bitArraySize);
    }

    public void add(String item) {
        if (item == null || item.isBlank()) return;
        long[] hashes = computeDualHashes(item);
        for (int i = 0; i < numHashFunctions; i++) {
            int combinedHash = (int) ((hashes[0] + i * hashes[1]) & 0x7fffffff);
            bitSet.set(combinedHash % bitArraySize);
        }
        insertedElements++;
    }

    public boolean mightContain(String item) {
        if (item == null || item.isBlank()) return false;
        long[] hashes = computeDualHashes(item);
        for (int i = 0; i < numHashFunctions; i++) {
            int combinedHash = (int) ((hashes[0] + i * hashes[1]) & 0x7fffffff);
            if (!bitSet.get(combinedHash % bitArraySize)) {
                return false;
            }
        }
        return true;
    }

    private long[] computeDualHashes(String input) {
        byte[] data = input.toLowerCase().getBytes(StandardCharsets.UTF_8);
        long fnv = 0xcbf29ce484222325L;
        long djb2 = 5381L;
        for (byte b : data) {
            fnv ^= (b & 0xff);
            fnv *= 0x100000001b3L;
            djb2 = ((djb2 << 5) + djb2) + (b & 0xff);
        }
        return new long[]{fnv, djb2};
    }

    public int getBitArraySize() { return bitArraySize; }
    public int getNumHashFunctions() { return numHashFunctions; }
    public double getEstimatedFalsePositiveRate() {
        return Math.pow(1 - Math.exp((double) (-numHashFunctions * insertedElements) / bitArraySize), numHashFunctions);
    }
}