const lodashGet = require('lodash.get');
// const CyrillicToTranslit = require('cyrillic-to-translit-js');
const Fuse = require('fuse.js');

const rules = require('../../dataset/rules.json');

// const cyrillicToTranslit = new CyrillicToTranslit();

const options = {
  shouldSort: true,
  threshold: 0.15,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 6,
};

class MessageUtil {
  findInText(message, searchFor, strict = false) {
    /**
     * Direct hit
     * */
    let directHit = false;

    if (searchFor.length <= 4) {
      if (strict) {
        directHit = message
          .replace(/[^\w\s]/gi, ' ')
          .replace(/\s\s+/g, ' ')
          .split(' ')
          .find((word) => word.toLowerCase() === searchFor.toLowerCase());
      } else {
        directHit = message.toLowerCase().includes(searchFor.toLowerCase());
      }

      return directHit;
    }

    /**
     * Translit hit
     * */
    // const translitHit = cyrillicToTranslit
    //   .transform(message, ' ')
    //   .toLowerCase()
    //   .includes(cyrillicToTranslit.transform(searchFor, ' ').toLowerCase());
    //
    // if (translitHit) {
    //   return true;
    // }

    /**
     * Contains search
     * */
    // return message.toLowerCase().includes(searchFor.toLowerCase());
    return false;
  }

  /**
   * @param {string} message
   * @param {string[]} wordsArray
   *
   * @returns {string | null}
   * */
  fuseInText(message, wordsArray) {
    /**
     * Fuse hit
     * */
    const fuseInstance = new Fuse([message], options);

    return wordsArray.find((word) => !!fuseInstance.search(word).length) || null;
  }

  isHit(andCondition, rule, message) {
    let findText = '';

    let strictOrCondition = false;

    if (rule.strict_or) {
      strictOrCondition = rule.strict_or.find((condition) => {
        let filterText = condition;

        if (filterText.startsWith('_$')) {
          filterText = lodashGet(rules, filterText.replace('_$', ''));

          if (Array.isArray(filterText)) {
            const da3 = filterText.some((nestText) => {
              const da4 = this.findInText(message, nestText, true);

              if (da4) {
                findText = nestText;
                return da4;
              }

              return false;
            });

            return da3;
          }
        }

        const da2 = this.findInText(message, filterText);

        if (da2) {
          findText = filterText;
          return da2;
        }

        return false;
      });
    }

    if (andCondition && strictOrCondition) {
      return { result: andCondition && strictOrCondition, findText, orType: 'strictOrCondition' };
    }

    const orCondition = rule.or.find((condition) => {
      let filterText = condition;

      if (filterText.startsWith('_$')) {
        filterText = lodashGet(rules, filterText.replace('_$', ''));

        if (Array.isArray(filterText)) {
          const da3 = filterText.some((nestText) => {
            const da4 = this.findInText(message, nestText);

            if (da4) {
              findText = nestText;
              return da4;
            }

            return false;
          });

          return da3;
        }
      }

      const da2 = this.findInText(message, filterText);

      if (da2) {
        findText = filterText;
        return da2;
      }

      return false;
    });

    return { result: andCondition && orCondition, findText, orType: 'orCondition' };
  }
}

module.exports = {
  MessageUtil,
};
