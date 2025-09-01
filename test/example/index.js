import { partition } from "lodash";

const numbers = [1, 2, 3, 4];
const partitions = partition(numbers, (n) => n % 2);

console.log("The numbers are:   ", numbers);
console.log("The partitions are:", partitions);
