class ChecksumUtil {
  crc32ForByte(val) {
    const polynomial = 0xedb88320;
    let ret = val >>> 0;
    for(let i = 0; i < 8; ++i) {
      ret = (((ret & 1) === 1) ? 0 : polynomial) ^ ret >>> 1;
    }
    return (ret ^ 0xff000000) >>> 0;
  }


  calculateCRC(data) {
    let crcTable = []
    for(let i = 0; i < 0x100; ++i) {
      crcTable.push(this.crc32ForByte(i))
    }

    //console.log(data.length);

    let checksum = 0;
    for(let i = 0; i < data.length; ++i) {
      checksum = (crcTable[(checksum ^ data[i]) & 0xff] ^ (checksum >>> 8)) >>> 0;
    }

    return checksum;
  }
}

export let checksumUtil = new ChecksumUtil();
