<?php

namespace Database\Seeders;

use App\Models\FormField;
use Illuminate\Database\Seeder;

/** Starter dynamic fields; admins can change all of these from the UI. */
class FormFieldSeeder extends Seeder
{
    public function run(): void
    {
        $fields = [
            ['journal_name', 'Journal / conference name', 'text', true, null],
            ['publication_type', 'Publication type', 'select', true,
                ['Journal article', 'Conference paper', 'Book chapter', 'Book', 'Thesis']],
            ['keywords', 'Keywords', 'dynamic_list', false, null],
            ['indexing_database', 'Indexed in', 'select', false, [
                'Scopus', 'Web of Science (SCIE / SSCI / AHCI)', 'Web of Science (ESCI)', 'PubMed / MEDLINE',
                'PubMed Central', 'Embase', 'CINAHL', 'PsycINFO', 'ERIC', 'EconLit', 'IEEE Xplore',
                'ACM Digital Library', 'arXiv', 'Google Scholar', 'DOAJ', 'AJOL (African Journals Online)',
                'African Index Medicus', 'Africa-Wide Information', 'SciELO', 'CAB Abstracts', 'AGRIS',
                'Dimensions', 'Not indexed', 'Other',
            ]],
        ];

        foreach ($fields as $i => [$key, $label, $type, $required, $options]) {
            FormField::updateOrCreate(
                ['field_key' => $key],
                ['label' => $label, 'type' => $type, 'is_required' => $required, 'options' => $options,
                 'is_active' => true, 'sort_order' => $i + 1],
            );
        }
    }
}