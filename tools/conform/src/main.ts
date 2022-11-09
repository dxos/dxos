import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const main = async () => {
  yargs(hideBin(process.argv)).scriptName('conform').help().argv;
};

main();
