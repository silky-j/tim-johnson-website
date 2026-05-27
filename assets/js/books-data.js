// Books, edited volumes, and book chapters by Timothy P. Johnson.
// kind: 'authored' | 'edited' | 'chapter'
window.BOOKS = [
  // ---------------- 2020+ ----------------
  {
    year: 2026, kind: 'authored',
    title: 'Asking Questions: The Definitive Guide to Questionnaire Design (3rd Edition)',
    authors: 'Norman M. Bradburn, Michael J. Stern, Timothy P. Johnson',
    publisher: 'Wiley',
  },
  {
    year: 2020, kind: 'chapter',
    title: 'Culture and Response Behavior: An Overview of Cultural Mechanisms Explaining Survey Error',
    authors: 'H. Silber, T. P. Johnson',
    inBook: 'Understanding Survey Methodology (ed. P. S. Brenner)',
    publisher: 'Springer, Cham',
  },
  {
    year: 2020, kind: 'chapter',
    title: 'Power, Culture and Item Nonresponse in Social Surveys',
    authors: 'K. M. Meitinger, T. P. Johnson',
    inBook: 'Understanding Survey Methodology (ed. P. S. Brenner)',
    publisher: 'Springer, Cham',
  },

  // ---------------- 2010–2019 ----------------
  {
    year: 2019, kind: 'chapter',
    title: 'Race- and Ethnicity-of-Interviewer Effects',
    authors: 'A. L. Holbrook, T. P. Johnson, M. Krysan',
    inBook: 'Experimental Methods in Survey Research',
  },
  {
    year: 2019, kind: 'chapter',
    title: 'Survey Experiments and Changes in Question Wording',
    authors: 'A. L. Holbrook, D. Sterrett, A. W. Crosby, M. Stavrakantonaki, X. Wang, T. Zhao, T. P. Johnson',
    inBook: 'Repeated Cross-Sectional Surveys',
  },
  {
    year: 2018, kind: 'edited',
    title: 'Advances in Comparative Survey Methods: Multinational, Multiregional, and Multicultural Contexts (3MC)',
    authors: 'Eds. Timothy P. Johnson, Beth-Ellen Pennell, Ineke A. L. Stoop, Brita Dorer',
    publisher: 'Wiley',
  },
  {
    year: 2018, kind: 'chapter',
    title: 'The Promise and Challenge of 3MC Research',
    authors: 'Timothy P. Johnson, Beth-Ellen Pennell, Ineke A. L. Stoop, Brita Dorer',
    inBook: 'Advances in Comparative Survey Methods: Multinational, Multiregional, and Multicultural Contexts (3MC)',
    publisher: 'Wiley',
  },
  {
    year: 2018, kind: 'chapter',
    title: 'Seeking Clarifications for Problematic Questions: Effects of Interview Language and Respondent Acculturation',
    authors: 'E. Kapousouz, T. P. Johnson, A. L. Holbrook',
    inBook: 'Advances in Comparative Survey Methods: Multinational, Multiregional, and Multicultural Contexts (3MC)',
    publisher: 'Wiley',
  },
  {
    year: 2018, kind: 'chapter',
    title: 'How should immigrants adapt to their country of residence? A mixed methods approach to evaluate the international applicability of a question from the German General Social Survey (ALLBUS)',
    authors: 'M. Braun, T. P. Johnson, E. Davidov, P. Schmidt, B. Meuleman',
    inBook: 'Cross-Cultural Analysis: Methods and Applications, 2nd Edition (eds. E. Davidov, P. Schmidt, J. Billiet, B. Meuleman)',
    publisher: 'Routledge',
  },
  {
    year: 2017, kind: 'chapter',
    title: 'Big Data and Survey Research: Supplement or Substitute?',
    authors: 'T. P. Johnson, T. W. Smith',
    inBook: 'Seeing Cities Through Big Data',
    publisher: 'Springer Geography, Cham',
  },
  {
    year: 2017, kind: 'chapter',
    title: 'The Use of Biological Measures in Social Research on Drug Misuse',
    authors: 'M. Fendrich, T. P. Johnson, J. Becker',
    inBook: 'Research Methods in the Study of Substance Abuse',
    publisher: 'Springer, Cham',
  },
  {
    year: 2017, kind: 'chapter',
    title: 'Using Surveys to Study Substance Use Behavior',
    authors: 'T. P. Johnson, J. B. VanGeest',
    inBook: 'Research Methods in the Study of Substance Abuse',
    publisher: 'Springer, Cham',
  },
  {
    year: 2017, kind: 'chapter',
    title: 'Quantitative Designs: Surveys',
    authors: 'T. P. Johnson, J. B. VanGeest',
    inBook: 'Research Methods in the Study of Substance Abuse',
    publisher: 'Springer, Cham',
  },
  {
    year: 2017, kind: 'chapter',
    title: 'History of Substance Abuse Research in the United States',
    authors: 'J. B. VanGeest, T. P. Johnson, S. A. Alemagno',
    inBook: 'Research Methods in the Study of Substance Abuse',
    publisher: 'Springer, Cham',
  },
  {
    year: 2017, kind: 'edited',
    title: 'Research Methods in the Study of Substance Abuse',
    authors: 'Eds. Jonathan B. VanGeest, Timothy P. Johnson, Sonia A. Alemagno',
    publisher: 'Springer',
  },
  {
    year: 2014, kind: 'edited',
    title: 'Hard-to-Survey Populations',
    authors: 'Eds. R. Tourangeau, B. Edwards, T. Johnson, K. Wolter, N. Bates',
    publisher: 'Cambridge University Press',
  },
  {
    year: 2014, kind: 'edited',
    title: 'Handbook of Health Survey Methods',
    authors: 'Ed. Timothy P. Johnson',
    publisher: 'Wiley',
  },
  {
    year: 2014, kind: 'chapter',
    title: 'Origins and Development of Health Survey Methods',
    authors: 'Timothy P. Johnson',
    inBook: 'Handbook of Health Survey Methods',
    publisher: 'Wiley',
  },
  {
    year: 2014, kind: 'chapter',
    title: 'Surveys of Physicians',
    authors: 'J. B. VanGeest, T. J. Beebe, T. P. Johnson',
    inBook: 'Handbook of Health Survey Methods',
  },
  {
    year: 2014, kind: 'chapter',
    title: 'Surveying Political Extremists',
    authors: 'Timothy P. Johnson, Allyson L. Holbrook, Keith Atterberry',
    inBook: 'Hard-to-Survey Populations',
    publisher: 'Cambridge University Press',
  },
  {
    year: 2011, kind: 'chapter',
    title: 'Some Issues in the Application of Latent Class Models for Questionnaire Design',
    authors: 'J. A. Harkness, T. P. Johnson',
    inBook: 'Question Evaluation Methods',
  },
  {
    year: 2010, kind: 'edited',
    title: 'Survey Methods in Multinational, Multiregional, and Multicultural Contexts',
    authors: 'Eds. J. A. Harkness, M. Braun, B. Edwards, T. P. Johnson, L. E. Lyberg, P. Ph. Mohler, B.-E. Pennell, T. W. Smith',
    publisher: 'Wiley',
  },
  {
    year: 2010, kind: 'chapter',
    title: 'Comparative Survey Methodology',
    authors: 'J. A. Harkness, B. Edwards, M. Braun, T. P. Johnson, L. E. Lyberg, P. Ph. Mohler, B.-E. Pennell, T. W. Smith',
    inBook: 'Survey Methods in Multinational, Multiregional, and Multicultural Contexts',
    publisher: 'Wiley',
  },
  {
    year: 2010, kind: 'chapter',
    title: 'An Illustrative Review of Techniques for Detecting Inequivalences',
    authors: 'M. Braun, T. P. Johnson',
    inBook: 'Survey Methods in Multinational, Multiregional, and Multicultural Contexts',
  },
  {
    year: 2010, kind: 'chapter',
    title: 'Equivalence, Comparability, and Methodological Progress',
    authors: 'P. Ph. Mohler, T. P. Johnson',
    inBook: 'Survey Methods in Multinational, Multiregional, and Multicultural Contexts',
  },
  {
    year: 2010, kind: 'chapter',
    title: 'Survey Response Styles Across Cultures',
    authors: 'T. P. Johnson, S. Shavitt, A. Holbrook',
    inBook: 'Cross-Cultural Research Methods in Psychology',
    publisher: 'Cambridge University Press',
  },

  // ---------------- 2000–2009 ----------------
  {
    year: 2003, kind: 'chapter',
    title: 'Social Desirability in Cross-Cultural Research',
    authors: 'Timothy P. Johnson, Fons J. R. van de Vijver',
    inBook: 'Cross-Cultural Survey Methods (eds. J. A. Harkness, F. J. R. van de Vijver, P. Ph. Mohler)',
    publisher: 'Wiley',
  },
  {
    year: 2003, kind: 'chapter',
    title: 'Questionnaire Design in Comparative Research',
    authors: 'Janet A. Harkness, Fons J. R. van de Vijver, Timothy P. Johnson',
    inBook: 'Cross-Cultural Survey Methods (eds. J. A. Harkness, F. J. R. van de Vijver, P. Ph. Mohler)',
    publisher: 'Wiley',
  },
  {
    year: 2001, kind: 'chapter',
    title: 'Inclusion of Disabled Populations in Interview Surveys: Review and recommendations',
    authors: 'T. P. Johnson, J. A. Parsons, S. Baum, G. Hendershot',
    inBook: 'Research in Social Science and Disability (eds. S. N. Barnartt, B. M. Altman)',
    publisher: 'JAI Press',
  },

  // ---------------- 1990–1999 ----------------
  {
    year: 1997, kind: 'chapter',
    title: 'Social Cognition and Responses to Survey Questions Among Culturally Diverse Populations',
    authors: 'T. P. Johnson, D. O’Rourke, N. Chavez, S. Sudman, R. Warnecke, L. Lacey, J. Horm',
    inBook: 'Survey Measurement and Process Quality',
  },
];
